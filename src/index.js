const sharp = require('sharp')

module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('qn-uploader', {
      handle,
      name: '千牛图床',
      config: config
    })
  }

  const handle = async function (ctx) {
    const userConfig = ctx.getConfig('picBed.qn-uploader')
    if (!userConfig) {
      throw new Error('Can\'t find uploader config')
    }

    const { cookie, folderId = '0', convertToWebp = false } = userConfig
    if (!cookie) {
      const msg = '请先配置千牛Cookie'
      ctx.emit('notification', {
        title: '上传失败',
        body: msg,
        text: msg
      })
      return
    }

    const url = `https://stream-upload.taobao.com/api/upload.api?_input_charset=utf-8&appkey=tu&folderId=${folderId}&picCompress=false&watermark=false`
    const headers = {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
      'Referer': 'https://myseller.taobao.com/home.htm/material-center/mine-material/sucai-tu',
      'Origin': 'https://myseller.taobao.com',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    }

    const imgList = ctx.output
    for (const img of imgList) {
      // 确保文件名有扩展名
      let fileName = img.fileName || img.filename || 'image.png'
      if (!fileName.includes('.')) {
        fileName += '.png'
      }

      let image = img.buffer
      if (!image && img.base64Image) {
        image = Buffer.from(img.base64Image, 'base64')
      }

      // WebP 转换逻辑
      if (convertToWebp) {
        try {
          image = await sharp(image).webp().toBuffer()
          // 修改扩展名为 .webp
          const lastDotIndex = fileName.lastIndexOf('.')
          if (lastDotIndex !== -1) {
            fileName = fileName.substring(0, lastDotIndex) + '.webp'
          } else {
            fileName += '.webp'
          }
        } catch (e) {
          ctx.log.warn('WebP conversion failed: ' + e.message)
          // 转换失败则继续使用原图上传
        }
      }

      const postConfig = {
        method: 'POST',
        url,
        headers,
        formData: {
          file: {
            value: image,
            options: {
              filename: fileName
            }
          }
        }
      }

      try {
        const body = await ctx.Request.request(postConfig)
        
        let response
        try {
          response = JSON.parse(body)
        } catch (e) {
          // 非JSON响应处理
          throw new Error('响应解析失败: ' + (body && body.length > 100 ? body.substring(0, 100) + '...' : body))
        }

        if (response.success && response.object && response.object.url) {
          img.imgUrl = response.object.url
          img.url = response.object.url
          img.origin = response.object.url
          img.type = 'QN' // PicList 兼容
          
          delete img.base64Image
          delete img.buffer
        } else {
          // 提取错误信息
          let msg = response.message || response.error || '未知错误'
          if (!msg && body) msg = '服务器响应异常'
          throw new Error(msg)
        }
      } catch (err) {
        let errorMsg = err.message || JSON.stringify(err)
        
        // 错误信息优化
        if (errorMsg.includes('login') || errorMsg.includes('登录')) {
          errorMsg = 'Cookie可能已过期，请重新配置'
        } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          errorMsg = '权限不足，请检查Cookie权限'
        } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
          errorMsg = '请求超时，请检查网络连接'
        } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
          errorMsg = '网络连接失败，请检查网络设置'
        }

        ctx.emit('notification', {
          title: '上传失败',
          body: errorMsg,
          text: errorMsg
        })
        img.imgUrl = ''
        img.url = ''
      }
    }

    return ctx
  }

  const config = ctx => {
    const userConfig = ctx.getConfig('picBed.qn-uploader') || {}
    return [
      {
        name: 'cookie',
        type: 'input',
        default: userConfig.cookie || '',
        required: true,
        message: '千牛Cookie（请从千牛卖家中心获取完整Cookie）',
        alias: '千牛Cookie'
      },
      {
        name: 'folderId',
        type: 'input',
        default: userConfig.folderId || '0',
        required: false,
        message: '文件夹ID（默认为根目录0，可指定其他文件夹ID）',
        alias: '文件夹ID'
      },
      {
        name: 'convertToWebp',
        type: 'confirm',
        default: userConfig.convertToWebp || false,
        required: false,
        message: '是否将上传图片转换为WebP格式',
        alias: '开启WebP转换'
      }
    ]
  }

  return {
    uploader: 'qn-uploader',
    register
  }
}
