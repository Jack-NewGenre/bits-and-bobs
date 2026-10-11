export interface Gaze {
  x: number;
  y: number;
}

/**
 * Where to look, as a vector no longer than 1, for a pointer `dx`/`dy` pixels
 * from the centre of whatever is looking. It points at the pointer and grows
 * with distance until it reaches full strength at `reach` pixels.
 */
export function gazeToward(dx: number, dy: number, reach: number): Gaze {
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || reach <= 0) return { x: 0, y: 0 };
  const strength = Math.min(distance / reach, 1);
  return { x: (dx / distance) * strength, y: (dy / distance) * strength };
}

export interface HeadTurn {
  /** Degrees the head turns sideways at full gaze. */
  yaw: number;
  /** Degrees the head tips up or down at full gaze. */
  pitch: number;
}

export const HEAD_TURN: HeadTurn = { yaw: 38, pitch: 16 };

/**
 * A CSS transform that slides something `x`/`y` pixels at full gaze, reading
 * the current gaze from the `--gaze-x` and `--gaze-y` custom properties.
 */
export function gazeShift(x: number, y: number): string {
  return `translate(calc(var(--gaze-x) * ${x}px), calc(var(--gaze-y) * ${y}px))`;
}

/**
 * A CSS transform that places a feature drawn at the centre of a head onto a
 * sphere of `radius` at `lon`/`lat` degrees, then turns the sphere with the
 * gaze. Features slide across the face and flatten towards the edge, which is
 * what sells the turn.
 */
export function gazeOnSphere(
  lon: number,
  lat: number,
  radius: number,
  turn: HeadTurn = HEAD_TURN
): string {
  const yaw = `calc(${lon}deg + var(--gaze-x) * ${turn.yaw}deg)`;
  const tip = `calc(${lat}deg + var(--gaze-y) * ${turn.pitch}deg)`;
  const shift = `translate(calc(sin(${yaw}) * cos(${tip}) * ${radius}px), calc(sin(${tip}) * ${radius}px))`;
  return `${shift} scale(cos(${yaw}), cos(${tip}))`;
}
