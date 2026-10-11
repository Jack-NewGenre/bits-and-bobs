/**
 * Fabric filters for Curves and per-colour Hue/Saturation. Each runs as a
 * WebGL shader where Fabric filters on the GPU, and through the pure maths in
 * `curves.ts` and `hue-ranges.ts` where it filters on a 2D canvas.
 */

import {
  classRegistry,
  filters,
  type T2DPipelineState,
  type TWebGLUniformLocationMap,
} from "fabric";

import {
  curveSpline,
  curveTable,
  IDENTITY_CURVE,
  isIdentityCurve,
  MAX_CURVE_POINTS,
} from "@/lib/image/editor/curves";
import {
  COLOUR_RANGES,
  isNeutralShift,
  NEUTRAL_RANGES,
  shiftByRange,
  type RangeShifts,
} from "@/lib/image/editor/hue-ranges";
import type { Point2D } from "@/lib/image/editor/shapes";

const CURVE_SHADER = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uXs[${MAX_CURVE_POINTS}];
  uniform float uYs[${MAX_CURVE_POINTS}];
  uniform float uM2[${MAX_CURVE_POINTS}];
  uniform float uCount;
  varying vec2 vTexCoord;
  float curve(float v) {
    if (v <= uXs[0]) return clamp(uYs[0], 0.0, 1.0);
    for (int i = 0; i < ${MAX_CURVE_POINTS - 1}; i++) {
      if (float(i) + 1.0 >= uCount) break;
      if (v <= uXs[i + 1]) {
        float h = uXs[i + 1] - uXs[i];
        float a = (uXs[i + 1] - v) / h;
        float b = (v - uXs[i]) / h;
        float y = a * uYs[i] + b * uYs[i + 1]
          + ((a * a * a - a) * uM2[i] + (b * b * b - b) * uM2[i + 1]) * h * h / 6.0;
        return clamp(y, 0.0, 1.0);
      }
    }
    float last = uYs[0];
    for (int i = 0; i < ${MAX_CURVE_POINTS}; i++) {
      if (float(i) < uCount) last = uYs[i];
    }
    return clamp(last, 0.0, 1.0);
  }
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    gl_FragColor = vec4(curve(color.r), curve(color.g), curve(color.b), color.a);
  }
`;

type CurveProps = {
  points: Point2D[];
};

/** A master RGB tone curve. */
export class CurveFilter extends filters.BaseFilter<"SmudgeCurve", CurveProps> {
  declare points: Point2D[];
  static type = "SmudgeCurve";
  static defaults: CurveProps = { points: [...IDENTITY_CURVE] };
  static uniformLocations = ["uXs", "uYs", "uM2", "uCount"];

  getFragmentSource() {
    return CURVE_SHADER;
  }

  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const table = curveTable(this.points);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = table[data[i]];
      data[i + 1] = table[data[i + 1]];
      data[i + 2] = table[data[i + 2]];
    }
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    locations: TWebGLUniformLocationMap,
  ) {
    const { xs, ys, m2 } = curveSpline(this.points);
    const padded = (values: number[]) => {
      const out = new Float32Array(MAX_CURVE_POINTS);
      out.set(values.slice(0, MAX_CURVE_POINTS));
      return out;
    };
    gl.uniform1fv(locations.uXs, padded(xs));
    gl.uniform1fv(locations.uYs, padded(ys));
    gl.uniform1fv(locations.uM2, padded(m2));
    gl.uniform1f(locations.uCount, Math.min(xs.length, MAX_CURVE_POINTS));
  }

  isNeutralState() {
    return isIdentityCurve(this.points);
  }
}

const RANGE_SHADER = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec3 uShifts[6];
  varying vec2 vTexCoord;
  vec3 rgb2hsl(vec3 c) {
    float mx = max(max(c.r, c.g), c.b);
    float mn = min(min(c.r, c.g), c.b);
    float l = (mx + mn) / 2.0;
    float d = mx - mn;
    if (d < 1e-6) return vec3(0.0, 0.0, l);
    float s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    float h = mx == c.r ? mod((c.g - c.b) / d, 6.0) : mx == c.g ? (c.b - c.r) / d + 2.0 : (c.r - c.g) / d + 4.0;
    return vec3(h / 6.0, s, l);
  }
  float channel(float p, float q, float t) {
    float u = fract(t);
    if (u < 1.0 / 6.0) return p + (q - p) * 6.0 * u;
    if (u < 0.5) return q;
    if (u < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - u) * 6.0;
    return p;
  }
  vec3 hsl2rgb(vec3 hsl) {
    if (hsl.y <= 0.0) return vec3(hsl.z);
    float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
    float p = 2.0 * hsl.z - q;
    return vec3(channel(p, q, hsl.x + 1.0 / 3.0), channel(p, q, hsl.x), channel(p, q, hsl.x - 1.0 / 3.0));
  }
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float chroma = max(max(color.r, color.g), color.b) - min(min(color.r, color.g), color.b);
    if (chroma < 1e-6) { gl_FragColor = color; return; }
    vec3 hsl = rgb2hsl(color.rgb);
    vec3 shift = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float distance = abs(mod(hsl.x * 360.0 - float(i) * 60.0 + 540.0, 360.0) - 180.0);
      shift += clamp((45.0 - distance) / 30.0, 0.0, 1.0) * chroma * uShifts[i];
    }
    vec3 rgb = hsl2rgb(vec3(fract(hsl.x + shift.x / 360.0), clamp(hsl.y * (1.0 + shift.y), 0.0, 1.0), hsl.z));
    rgb = shift.z > 0.0 ? rgb + (1.0 - rgb) * shift.z : rgb * (1.0 + shift.z);
    gl_FragColor = vec4(rgb, color.a);
  }
`;

type RangeProps = {
  shifts: RangeShifts;
};

/** Hue, saturation and lightness shifts for each of six colour ranges. */
export class HueRangeFilter extends filters.BaseFilter<
  "SmudgeHueRange",
  RangeProps
> {
  declare shifts: RangeShifts;
  static type = "SmudgeHueRange";
  static defaults: RangeProps = { shifts: NEUTRAL_RANGES };
  static uniformLocations = ["uShifts"];

  getFragmentSource() {
    return RANGE_SHADER;
  }

  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = shiftByRange(
        [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255],
        this.shifts,
      );
      data[i] = Math.round(r * 255);
      data[i + 1] = Math.round(g * 255);
      data[i + 2] = Math.round(b * 255);
    }
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    locations: TWebGLUniformLocationMap,
  ) {
    const values = COLOUR_RANGES.flatMap((range) => {
      const { hue, saturation, lightness } = this.shifts[range];
      return [hue, saturation / 100, lightness / 100];
    });
    gl.uniform3fv(locations.uShifts, new Float32Array(values));
  }

  isNeutralState() {
    return COLOUR_RANGES.every((range) => isNeutralShift(this.shifts[range]));
  }
}

classRegistry.setClass(CurveFilter);
classRegistry.setClass(HueRangeFilter);
