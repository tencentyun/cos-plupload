(function () {

    var cos = {
        // 获取 bucket 信息：https://console.qcloud.com/cos4/bucket
        appid: '1250000000',
        bucket: 'test',
        region: 'cn-north', // 华南:cn-south 华北:cn-north 华东:cn-east
        protocol: location.protocol,
        lastAuthorization: '',
        getParams: function () {
            return {
                'success_action_status': '200'
            };
        },
        getRequestUrl: function () {
            return cos.protocol + '//' + cos.bucket + '-' + cos.appid + '.' + cos.region + '.myqcloud.com';
        },
        getAuthorization: function (callback) {

            /* [不推荐，可以用作前端调试] 方法一、前端调试时可以用以下方法，线上正式部署请使用方法二、方法三 */
            /*
             var method = 'POST';
             var pathname = '/';
             var queryParams = {};
             var headers = {};

             // 获取个人 API 密钥 https://console.qcloud.com/capi
             var sid = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
             var skey = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

             // 工具方法
             var getObjectKeys = function (obj) {
             var list = [];
             for (var key in obj) {
             if (obj.hasOwnProperty(key)) {
             list.push(key);
             }
             }
             return list.sort();
             };
             var obj2str = function (obj) {
             var i, key, val;
             var list = [];
             var keyList = getObjectKeys(obj);
             for (i = 0; i < keyList.length; i++) {
             key = keyList[i];
             val = obj[key] || '';
             key = key.toLowerCase();
             key = encodeURIComponent(key);
             list.push(key + '=' + encodeURIComponent(val));
             }
             return list.join('&');
             };

             // 签名有效起止时间
             var now = parseInt(new Date().getTime() / 1000) - 1;
             var expired = now + 3600; // 签名过期时刻，3600秒后

             // 要用到的 Authorization 参数列表
             var qSignAlgorithm = 'sha1';
             var qAk = sid;
             var qSignTime = now + ';' + expired;
             var qKeyTime = now + ';' + expired;
             var qHeaderList = getObjectKeys(headers).join(';').toLowerCase();
             var qUrlParamList = getObjectKeys(queryParams).join(';').toLowerCase();

             // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778
             // 步骤一：计算 SignKey
             var signKey = CryptoJS.HmacSHA1(qKeyTime, skey).toString();

             // 步骤二：构成 FormatString
             var formatString = [method.toLowerCase(), pathname, obj2str(queryParams), obj2str(headers), ''].join('\n');

             // 步骤三：计算 StringToSign
             var stringToSign = ['sha1', qSignTime, CryptoJS.SHA1(formatString).toString(), ''].join('\n');

             // 步骤四：计算 Signature
             var qSignature = CryptoJS.HmacSHA1(stringToSign, signKey).toString();

             // 步骤五：构造 Authorization
             var authorization  = [
             'q-sign-algorithm=' + qSignAlgorithm,
             'q-ak=' + qAk,
             'q-sign-time=' + qSignTime,
             'q-key-time=' + qKeyTime,
             'q-header-list=' + qHeaderList,
             'q-url-param-list=' + qUrlParamList,
             'q-signature=' + qSignature
             ].join('&');

             return authorization;
             */

            /* [推荐] 方法二、后端计算签名，这里是请求到 server/auth.js 启动的 NodeJS 接口 */
            cos.request('http://127.0.0.1:3333', function (authorization) {
                cos.lastAuthorization = authorization;
                callback(authorization);
            });

            // /* [推荐] 方法三、后端计算签名，这里是请求到 server/auth.php 提供的 PHP 后端接口 */
            // cos.request('/server/auth.php', function (authorization) {
            //     cos.lastAuthorization = authorization;
            //     callback(authorization);
            // });
        },
        request: function (url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    callback && callback(xhr.responseText);
                }
            };
            xhr.send();
        },
        refreshAuthorization: function () {
            cos.getAuthorization(function (authorization) {
                cos.lastAuthorization = authorization;
            });
        },
        getLastAuthorization: function () {
            return cos.lastAuthorization;
        }
    };
    cos.refreshAuthorization();

    window.cos = cos;

})();