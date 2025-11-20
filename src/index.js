module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('qn-uploader', {
      handle,
      name: '千牛图床',
      config: config
    })
  }

  const handle = async function (ctx) {
    let userConfig = ctx.getConfig('picBed.qn-uploader')
    if (!userConfig) {
      throw new Error('Can\'t find uploader config')
    }

    const cookie = userConfig.cookie
    if (!cookie) {
      ctx.emit('notification', {
        title: '上传失败',
        body: '请先配置千牛Cookie'
      })
      return
    }

    const folderId = userConfig.folderId || '0'
    const url = `https://stream-upload.taobao.com/api/upload.api?_input_charset=utf-8&appkey=tu&folderId=${folderId}&picCompress=false&watermark=false`
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
    const referer = 'https://myseller.taobao.com/home.htm/material-center/mine-material/sucai-tu'
    const origin = 'https://myseller.taobao.com'

    try {
      let imgList = ctx.output
      for (let i in imgList) {
        let image = imgList[i].buffer
        if (!image && imgList[i].base64Image) {
          image = Buffer.from(imgList[i].base64Image, 'base64')
        }

        const postConfig = {
          method: 'POST',
          url: url,
          headers: {
            'Cookie': cookie,
            'User-Agent': userAgent,
            'Referer': referer,
            'Origin': origin,
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          },
          formData: {
            file: {
              value: image,
              options: {
                filename: imgList[i].fileName
              }
            }
          }
        }

        let body = await ctx.Request.request(postConfig)
        delete imgList[i].base64Image
        delete imgList[i].buffer

        // 解析响应
        try {
          const response = JSON.parse(body)
          if (response.success === true && response.object && response.object.url) {
            imgList[i]['imgUrl'] = response.object.url
          } else {
            ctx.emit('notification', {
              title: '上传失败',
              body: '接口返回失败: ' + (response.message || '未知错误')
            })
          }
        } catch (parseErr) {
          ctx.emit('notification', {
            title: '上传失败',
            body: '响应解析失败: ' + parseErr.message
          })
        }
      }
    } catch (err) {
      ctx.emit('notification', {
        title: '上传失败',
        body: JSON.stringify(err)
      })
    }
  }

  const config = ctx => {
    let userConfig = ctx.getConfig('picBed.qn-uploader')
    if (!userConfig) {
      userConfig = {}
    }
    return [
      {
        name: 'cookie',
        type: 'input',
        default: userConfig.cookie,
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
      }
    ]
  }

  return {
    uploader: 'qn-uploader',
    register
  }
}