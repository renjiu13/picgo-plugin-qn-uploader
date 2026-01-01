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
      throw new Error('找不到上传配置，请先进行配置')
    }

    const { cookie, folderId = '0' } = userConfig
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
      // 1. 确定文件名
      let fileName = img.fileName || img.filename || 'image.png'
      if (!fileName.includes('.')) {
        fileName += '.png'
      }

      // 2. 获取图片 Buffer
      let image = img.buffer
      if (!image && img.base64Image) {
        image = Buffer.from(img.base64Image, 'base64')
      }

      // 3. 构造上传请求
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
          throw new Error('响应解析失败: ' + (body && body.length > 100 ? body.substring(0, 100) + '...' : body))
        }

        if (response.success && response.object && response.object.url) {
          img.imgUrl = response.object.url
          img.url = response.object.url
          img.origin = response.object.url
          img.type = 'QN' 
          
          delete img.base64Image
          delete img.buffer
        } else {
          let msg = response.message || response.error || '未知错误'
          if (!msg && body) msg = '服务器响应异常'
          throw new Error(msg)
        }
      } catch (err) {
        let errorMsg = err.message || JSON.stringify(err)
        
        // 错误信息友好化
        if (errorMsg.includes('login') || errorMsg.includes('登录')) {
          errorMsg = 'Cookie可能已过期，请重新获取'
        } else if (errorMsg.includes('403')) {
          errorMsg = '权限不足，请检查Cookie'
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
        message: '千牛Cookie',
        alias: '千牛Cookie'
      },
      {
        name: 'folderId',
        type: 'input',
        default: userConfig.folderId || '0',
        required: false,
        message: '文件夹ID（默认0）',
        alias: '文件夹ID'
      }
    ]
  }

  return {
    uploader: 'qn-uploader',
    register
  }
}