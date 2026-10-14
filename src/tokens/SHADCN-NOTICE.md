# Shadcn adaptation notice

The shadcn palette values and New York-inspired geometry in Quasar Design System are adapted from [unovue/shadcn-vue](https://github.com/unovue/shadcn-vue), pinned to commit `b251d9fd92aa496495e127137a7734704fb34a29`.

Upstream source paths at that commit:

- `apps/v4/registry/themes.ts` — modern Neutral, Stone, and Zinc palettes.
- `apps/v4/public/r/themes/gray.json` and `apps/v4/public/r/themes/slate.json` — official legacy HSL Gray and Slate palettes.
- `apps/v4/registry/new-york-v4/ui/` and `apps/v4/assets/css/main.css` — component geometry and radius bindings.

The adaptation maps these values to native Quasar semantic tokens and styling rather than requiring the upstream component framework. It includes sRGB conversion and quantization, contrast calibration of text/focus and role-state colors, explicit aliases for missing legacy sidebar slots, and native Quasar component geometry adaptations. The isolated reference application is development-only and is not shipped in the package.

The following upstream copyright and MIT license apply to the adapted upstream material. This notice is distributed with that material; it does not replace the package's root license for original Quasar Design System work.

```text
MIT License

Copyright (c) 2023 unovue

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
