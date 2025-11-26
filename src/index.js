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
        body: '请先配置千牛Cookie',
        text: '请先配置千牛Cookie' // 兼容 PicList
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

        // 兼容 PicList 和 PicGo 的文件名处理
        const fileName = imgList[i].fileName || imgList[i].filename || 'image.png'
        // 确保文件名有适当的扩展名
        let finalFileName = fileName
        if (!fileName.includes('.')) {
          finalFileName = fileName + '.png'
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
                filename: finalFileName
              }
            }
          }
        }

        let body = await ctx.Request.request(postConfig)
        
        // 清理缓冲区数据
        delete imgList[i].base64Image
        delete imgList[i].buffer

        // 解析响应
        try {
          const response = JSON.parse(body)
          if (response.success === true && response.object && response.object.url) {
            // 同时设置 imgUrl 和 url 以兼容不同平台
            imgList[i]['imgUrl'] = response.object.url
            imgList[i]['url'] = response.object.url
            
            // 设置其他可能需要的字段
            imgList[i]['origin'] = response.object.url
            
            // PicList 兼容字段
            imgList[i]['type'] = 'QN'
          } else {
            // 更详细的错误信息
            let errorMsg = '接口返回失败'
            if (response.message) {
              errorMsg += ': ' + response.message
            } else if (response.error) {
              errorMsg += ': ' + response.error
            } else {
              errorMsg += ': 未知错误'
            }
            
            // 如果响应体不为空但不是有效的JSON，可能是网络或其他问题
            if (!response.success && !response.message && !response.error && body) {
              errorMsg += ' (服务器响应: ' + body.substring(0, 100) + ')'
            }
            
            ctx.emit('notification', {
              title: '上传失败',
              body: errorMsg,
              text: errorMsg // 兼容 PicList
            })
            // 设置错误标记
            imgList[i].imgUrl = ''
            imgList[i].url = ''
          }
        } catch (parseErr) {
          // 如果解析JSON失败，可能是返回了HTML或其他格式的内容
          let errorMsg = '响应解析失败'
          if (body && typeof body === 'string') {
            // 尝试提取关键错误信息
            if (body.includes('登录') || body.includes('login')) {
              errorMsg += ': Cookie可能已过期，请重新配置'
            } else if (body.includes('403') || body.includes('Forbidden')) {
              errorMsg += ': 权限不足，请检查Cookie权限'
            } else if (body.length > 100) {
              // 如果响应很长，只显示前100个字符
              errorMsg += ': ' + body.substring(0, 100) + '...'
            } else {
              errorMsg += ': ' + body
            }
          } else {
            errorMsg += ': ' + parseErr.message
          }
          
          ctx.emit('notification', {
            title: '上传失败',
            body: errorMsg,
            text: errorMsg // 兼容 PicList
          })
          // 设置错误标记
          imgList[i].imgUrl = ''
          imgList[i].url = ''
        }
      }
    } catch (err) {
      let errorMsg = '上传异常'
      if (err.message) {
        errorMsg += ': ' + err.message
      } else {
        errorMsg += ': ' + JSON.stringify(err)
      }
      
      // 特殊错误处理
      if (err.message && (err.message.includes('timeout') || err.message.includes('ETIMEDOUT'))) {
        errorMsg += ' (请求超时，请检查网络连接)'
      } else if (err.message && (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED'))) {
        errorMsg += ' (网络连接失败，请检查网络设置)'
      }
      
      ctx.emit('notification', {
        title: '上传失败',
        body: errorMsg,
        text: errorMsg // 兼容 PicList
      })
    }
    
    // 返回处理后的结果以兼容 PicList
    return ctx
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