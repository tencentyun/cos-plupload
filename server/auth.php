<?php

/**
 * php 签名样例
 */

function getAuthorization()
{
    $method = 'POST';
    $pathname = '/';
    $queryParams = array();
    $headers = array();

    // 获取个人 API 密钥 https://console.qcloud.com/capi
    $sid = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    $skey = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    // 工具方法
    function getObjectKeys($obj)
    {
        $list = array_keys($obj);
        sort($list);
        return $list;
    }

    function obj2str($obj)
    {
        $list = [];
        $keyList = getObjectKeys($obj);
        $len = count($keyList);
        for ($i = 0; $i < $len; $i++) {
            $key = $keyList[$i];
            $val = isset($obj[$key]) ? $obj[$key] : '';
            $key = strtolower($key);
            $key = urlencode($key);
            $list[] = $key . '=' . urlencode($val);
        }
        return implode('&', $list);
    }

    // 签名有效起止时间
    $now = time() - 1;
    $expired = $now + 3600; // 签名过期时刻，3600秒后

    // 要用到的 Authorization 参数列表
    $qSignAlgorithm = 'sha1';
    $qAk = $sid;
    $qSignTime = $now . ';' . $expired;
    $qKeyTime = $now . ';' . $expired;
    $qHeaderList = strtolower(implode(';', getObjectKeys($headers)));
    $qUrlParamList = strtolower(implode(';', getObjectKeys($queryParams)));

    // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778
    // 步骤一：计算 SignKey
    $signKey = hash_hmac("sha1", $qKeyTime, $skey);

    // 步骤二：构成 FormatString
    $formatString = implode("\n", array(strtolower($method), $pathname, obj2str($queryParams), obj2str($headers), ''));

    // 步骤三：计算 StringToSign
    $stringToSign = implode("\n", array('sha1', $qSignTime, sha1($formatString), ''));

    // 步骤四：计算 Signature
    $qSignature = hash_hmac('sha1', $stringToSign, $signKey);

    // 步骤五：构造 Authorization
    $authorization = implode('&', array(
        'q-sign-algorithm=' . $qSignAlgorithm,
        'q-ak=' . $qAk,
        'q-sign-time=' . $qSignTime,
        'q-key-time=' . $qKeyTime,
        'q-header-list=' . $qHeaderList,
        'q-url-param-list=' . $qUrlParamList,
        'q-signature=' . $qSignature
    ));

    return $authorization;
}

echo getAuthorization();