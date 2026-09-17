# scripts/resize/

批量等比缩放图片。一次性工具，不参与 `npm run build`。

## 用法

把某个目录下的图片统一缩放到指定尺寸，输出到该目录的**平级目录 `resize-output/`**。

```bash
node scripts/resize/resize-images.mjs <目录> <宽>x<高>

# 例：把 ~/Desktop/shots 里的图都做成 1280x800
node scripts/resize/resize-images.mjs ~/Desktop/shots 1280x800
# 产物在 ~/Desktop/resize-output/，文件名不变
```

## 尺寸不匹配时怎么裁

**等比缩放到「盖满」目标框，多出来的部分从右边和下边切掉**（即以左上角为锚点）。所以：

- 原图**更高**（比如 1:2 缩到 1:1）→ 切掉**底部**
- 原图**更宽**（比如 2:1 缩到 1:1）→ 切掉**右边**

结果一定正好是你指定的尺寸，不会留白边。

## 其它行为

- 识别的后缀：`.png` `.jpg` `.jpeg` `.webp` `.tif` `.tiff` `.gif` `.bmp`，目录里的其它文件直接忽略，不递归子目录。
- 输出编码：`.jpg`/`.jpeg` 写 JPEG（质量 0.92），**其余一律写 PNG**——注意 `.webp`/`.gif` 进去，出来的文件后缀不变但内容是 PNG。
- 单张失败（文件损坏等）只打印一行 `skipped xxx`，不中断整批；最后汇总 `3/4 images written to ...`。
- `resize-output/` 已存在时不会清空，同名文件覆盖。

## 只能在 macOS 跑

缩放和裁切实际由 `resize-one.js` 完成，通过系统自带的 `osascript` 调 AppKit。这样做是为了不给一个「构建时根本不会跑」的脚本引入 sharp 这类原生依赖。

**为什么不用 `sips`**：`sips` 只能从**中心**裁切，它的 `--cropOffset` 会被静默忽略——而「切右下」正是这个脚本的重点，所以必须落到 AppKit。

## 文件

- **`resize-images.mjs`** — 入口：解析参数、遍历目录、建 `resize-output/`、汇总结果。
- **`resize-one.js`** — 单张图片的缩放 + 裁切（JXA），给上面那个调用，一般不用手动跑：

    ```bash
    osascript -l JavaScript scripts/resize/resize-one.js <输入> <输出> <宽> <高>
    ```

    成功时往 stdout 打 `ok`，调用方靠这个 sentinel 判断是否真的落盘。
