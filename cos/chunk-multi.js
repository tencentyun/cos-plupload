(function () {
    // 获取 bucket 信息：https://console.qcloud.com/cos4/bucket
    var appid = '1250000000';
    var bucket = 'test';
    var region = 'cn-north'; // 华南:cn-south 华北:cn-north 华东:cn-east
    var CHUNK_SIZE = 1 * 1024 * 1024; // 每个分片 1MB
    var THREAD_NUM = 5; // 5 个请求并发上传
    var RETRY_TIMES = 3; // 分片错误重试 3 次

    var getCosUrl = function (path) {
        path.charAt(0) == '/' && (path = path.substr(1));
        return location.protocol + '//' + bucket + '-' + appid + '.' + region + '.myqcloud.com/' + path;
    };
    var getSignature = function (method, pathname, async, callback) {
        method = method.toUpperCase();
        if (async) {
            $.ajax({
                url: '../server/auth.php',
                data: {method: method, pathname: pathname},
                async: false,
                success: callback
            });
        } else {
            return $.ajax({
                url: '../server/auth.php',
                data: {method: method, pathname: pathname},
                async: false
            }).responseText;
        }
    };
    var initUploadAndGetUploadId = function (uploader, file, callback) {
        file._uploadKey = file.name;
        file._uploadNum = 0;
        file._uploadChunks = {};
        getSignature('POST', file._uploadKey, true, function (auth) {
            $.ajax({
                type: 'POST',
                url: getCosUrl(file._uploadKey) + '?uploads',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', auth);
                },
                success: function (r) {
                    var uploadId = $(r).find('UploadId')[0].textContent;
                    file._uploadId = uploadId;
                    callback(uploadId, file);
                }
            });
        });
    };

    var fileUploaded = function (uploader, file, callback) {
        getSignature('POST', file._uploadKey, true, function (auth) {
            $.ajax({
                type: 'POST',
                url: getCosUrl(file._uploadKey) + '?uploadId=' + file._uploadId,
                data: getEtagsBody(file._uploadChunks),
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', auth);
                    xhr.setRequestHeader('Content-Type', 'application/xml');
                },
                success: function (r) {
                    console.log(file._uploadKey, 'upload done');
                    callback(null);
                },
                error: function (r) {
                    console.log(file._uploadKey, 'upload error');
                    callback('error');
                }
            });
        });
    };
    var uploadSingleChunk = function (file, number, progress, callback) {
        var removeXhr = function (xhr) {
            for (var i = file._runningXhrs.length - 1; i >= 0; i--) {
                if (xhr === file._runningXhrs[i]) {
                    file._runningXhrs.splice(i, 1);
                }
            }
        };
        var uploadChunk = function (url, blob, cb) {
            getSignature('PUT', file._uploadKey, true, function (auth) {
                var xhr = new XMLHttpRequest();
                xhr.open('PUT', url, true);
                xhr.setRequestHeader('Authorization', auth);
                if (xhr.upload) {
                    xhr.upload.onprogress = progress;
                }
                xhr.onload = function (e) {
                    cb(xhr.status == 200 ? null : 'http error ' + xhr.status, {
                        data: xhr.responseText,
                        status: xhr.status,
                        responseHeaders: xhr.getAllResponseHeaders()
                    });
                };
                xhr.onerror = function () {
                    cb('xhr error', {
                        data: xhr.responseText,
                        status: xhr.status,
                        responseHeaders: xhr.getAllResponseHeaders()
                    });
                };
                xhr.onloadend = function () {
                    removeXhr(xhr);
                    xhr = null;
                };
                file._runningXhrs.push(xhr);
                xhr.send(blob);
            });
        };

        var url = getCosUrl(file._uploadKey) + '?partNumber=' + number + '&uploadId=' + file._uploadId;
        var start = (number - 1) * CHUNK_SIZE;
        var end = start + CHUNK_SIZE >= file.size ? file.size : start + CHUNK_SIZE;
        var blobSlice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
        var blob = blobSlice.call(file.getNative(), start, end);
        var tryUpload = function (times) {
            uploadChunk(url, blob, function (err, data) {
                if (err) { // fail, retry
                    if (times >= RETRY_TIMES) {
                        callback(err, data);
                    } else {
                        tryUpload(times + 1);
                    }
                } else { // success
                    callback(err, data);
                }
            });
        };
        tryUpload(1);
    };
    var uploadSingleFile = function (uploader, file, callback) {
        var running = 0;
        var lastNumber = 0;
        var total = Math.ceil(file.size / CHUNK_SIZE);
        var preLoaded = 0;
        var preTime = Date.now();
        var progressTimer;
        var progress = function () {
            if (progressTimer) return;
            progressTimer = setTimeout(function () {
                var totalLoaded = 0;
                $.each(file._uploadChunks, function (k, v) {
                    totalLoaded += v.loaded;
                });
                var time = Date.now();
                console.log(file.name, parseInt(totalLoaded / file.size * 100) + '%',
                    (((totalLoaded - preLoaded) / 1024 / 1024) / ((time - preTime) / 1000)).toFixed(3) + 'MB/s');
                preTime = time;
                preLoaded = totalLoaded;
                progressTimer = 0;
            }, 500);
        };
        var uploadNextChunk = function (number, cb) {
            if (number <= total) {
                var chunk = {
                    number: number,
                    state: 'uploading',
                    loaded: 0,
                    ETag: ''
                };
                file._uploadChunks[number] = chunk;
                uploadSingleChunk(file, number, function (e) {
                    chunk.loaded = e.loaded;
                    progress();
                }, function (error, data) {
                    if (error) {
                        chunk.state = 'error';
                        cb(error);
                    } else {
                        chunk.state = 'done';
                        chunk.ETag = data.responseHeaders.split('"')[1];
                        cb();
                    }
                });
            }
        };
        // 处理上传出错
        file._runningXhrs = [];
        file._uploadError = false;
        window.file1 = file;
        var errorReset = function (error) {
            file._uploadError = error;
            for (var i = file._runningXhrs.length - 1; i >= 0; i--) {
                file._runningXhrs[i].abort();
            }
            callback && callback(error);
        };
        // 开始并发上传
        var unfinish = total;
        var nextThread = function () {
            if (running >= THREAD_NUM || lastNumber >= total || file._uploadError) return;
            ++running;
            ++lastNumber;
            uploadNextChunk(lastNumber, function (error) {
                --running;
                if (file._uploadError) { // 已经出错了，直接退出
                    return;
                } else if (error) { // 第一次遇到分片，返回文件上传出错
                    errorReset(error);
                    return;
                }
                if (--unfinish <= 0) {
                    fileUploaded(uploader, file, callback);
                } else {
                    nextThread();
                }
            });
            nextThread();
        };
        initUploadAndGetUploadId(uploader, file, nextThread);
    };
    var startUpload = function (uploader, files) {
        var uploadNextFile = function (index) {
            if (index >= files.length) {
                console.log('all completed!');
            } else {
                uploadSingleFile(uploader, files[index], function () {
                    uploadNextFile(index + 1);
                });
            }
        };
        uploadNextFile(0);
    };
    var getEtagsBody = function (ETags) {
        var i, xml = '<CompleteMultipartUpload>';
        for (i in ETags) {
            xml += '<Part><PartNumber>' + i + '</PartNumber><ETag>' + ETags[i].ETag + '</ETag></Part>';
        }
        xml += '</CompleteMultipartUpload>';
        return xml;
    };
    var mulltiThreadUpload = function (uploader, files) {
        startUpload(uploader, files);
    };

    window.CosMulltiThreadUpload = mulltiThreadUpload;
})();