# picgo-plugin-qn-uploader

千牛图床上传插件 for [PicGo](https://github.com/Molunerfinn/PicGo)

## 功能

- 支持上传图片到千牛图床
- 自动获取图片直链
- 支持指定文件夹上传（默认根目录）

## 安装

1. 在 PicGo 插件设置中搜索 `qn-uploader` 并安装
2. 或者下载本插件包，在 PicGo 中选择「导入本地插件」并选择本插件包

## 配置说明

### 获取千牛 Cookie

1. 打开 [千牛卖家中心](https://myseller.taobao.com/)
2. 登录账号后按 F12 打开开发者工具
3. 刷新页面，在 Network(网络) 标签中找到任意请求
4. 复制该请求的 Cookie 值（确保是完整的 Cookie）

### 插件配置

- **千牛Cookie**: 从千牛卖家中心获取的完整 Cookie
- **文件夹ID**: 千牛图片空间中的文件夹ID（默认为根目录0，可指定其他文件夹ID）

## 使用方法

1. 在 PicGo 图床设置中选择「千牛图床」
2. 填入获取到的千牛 Cookie
3. （可选）填入目标文件夹ID（留空则上传到根目录）
4. 保存设置后即可使用

## 注意事项

1. Cookie 有时效性，如提示上传失败请重新获取 Cookie
2. 仅支持 JPG/PNG/GIF 格式图片
3. 单张图片大小不能超过 5MB