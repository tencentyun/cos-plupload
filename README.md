# cos-plupload

plupload-2.3.1 demo for 腾讯云 XML API

## 使用步骤

1. 在腾讯云 COS 控制台创建 bucket
2. 确定使用的 COS 是 v4 版本：登陆https://console.qcloud.com/cos 如果左上角提示是云对象存储v4则说明要用v4的sdk否则就是v3的
3. 在控制台给 bucket 是指好跨域规则:
    * 来源 Origin: * 或指定域名
    * 操作 Methods: 至少选中 GET、POST、PUT
    * Allow-Headers: authorization,accept,content-type
    * Expose-Headers: ETag
4. 替换 cos/cos.js、server/auth.js、server/auth.php 里的配置信息，包括 appid、bucket、region、sid、skey
5. 注意 cos/cos.js 文件里的计算签名代码仅仅用做前端调试阶段，正式部署请使用后端计算签名的方式，并删除掉文件里的 sid、skey 以免造成密钥泄漏。
6. 把当前代码部署到静态服务器下，访问 examples 里的 html 可以试用 demo。
7. 当前 demo 使用的是 COS XML API，注意 region 格式不要填写错误（华南:cn-south 华北:cn-north 华东:cn-east）
8. 当前 demo 上传过程使用 PostObject 接口，目前（3月21日）仅支持华北园区支持此 API，其他园区会陆续支持，其他 XML API 请参考文档 https://www.qcloud.com/document/product/436/7751。

## 部分 demo 说明

1. 简单上传 demo: examples/custom.html
2. 分片单并发上传 demo: examples/chunk.html
3. 分片多并发上传 demo: examples/chunk-multi.html

## 其他说明

1. 如果需要支持 flash 上传，请防止一个 crossdomain.xml 文件，填写好允许跨域的配置，并设置文件公有读
2. html4 上传方式下，文件上传成功时，plupload 会跨域报错，获取不到某个临时 iframe 里的内容，可以使用 plupload 的 debug 版本调试查看原因。
