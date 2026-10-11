# Third-party notices

Parts of Photo Studio, the image editor, are adapted from
[PhotoCraft](https://github.com/storytold/photocraft), which is dual-licensed
under MIT or Apache-2.0. We use it under the MIT licence below. Only the
open-source code is used: none of PhotoCraft's name, logos or other brand
assets.

| File | Adapted from |
| --- | --- |
| `lib/image/editor/retouch.ts` | `crates/algo/src/retouch.rs`: dodge and burn tone ranges, protect tones |
| `lib/image/editor/curves.ts` | `crates/compose/src/adjust.rs`: `curve_lut`, natural spline |
| `lib/image/editor/hue-ranges.ts` | `crates/compose/src/adjust.rs`: `HueRange`, `hue_saturation` |

## PhotoCraft

```
MIT License

Copyright (c) 2026 ArtCraft Team and the PhotoCraft contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
