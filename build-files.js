/**
 * 文档构建脚本
 * @author: linnan
 * @since: 2016-04-02
 */

"use strict";

var fs = require('fs');
var path = require('path');
var process = require('process');

var markdown = require('markdown-it')({
    html: true
});
var watchFiles = [];

const DIST_PATH = path.join(__dirname, './dist');
const SRC_PATH = path.join(__dirname, './src');
const TEMPLATE_HTML = fs.readFileSync('./template.html');

const NODE_ENV = process.env.NODE_ENV || 'development';

function log() {
    console.log.apply(console, arguments);
}

function markDownToHtml(markDownText) {
    markDownText = markDownText.replace(/\.md(\W+?)/g, '.html$1');
    // 修改源地址md的文件为html文件
    return new Promise(resolve => resolve(markdown.render(markDownText)));
}

function combineHtmlTemplate(markDownHtmlText, srcFilePath) {
    let pathSplits = srcFilePath.split('\\'),
        moduleName = pathSplits[pathSplits.length - 2];
    return new Promise(resolve => {
        let text = TEMPLATE_HTML.toString('utf-8'),
            htmlText = text.replace('{{content}}', markDownHtmlText);
        if(moduleName === 'src') {
            htmlText = htmlText.replace('{{title}}', '交接文档')
                               .replace('{{operation}}', '');
        }else{
            htmlText = htmlText.replace('{{title}}', moduleName)
                               .replace('{{operation}}',
                                   '<button id="back">返回</button>');
        }
        resolve(htmlText);
    });
}

function writeToTargetDirectory(targetFilePath, data) {
    targetFilePath = targetFilePath.replace(/[.]md$/, '.html');
    return new Promise(function (resolve) {
        fs.writeFile(targetFilePath, data, function (err) {
            if(err) {
                log(targetFilePath + ' occur a error when write data');
            }else {
                log(targetFilePath + ' write success');
            }
        });
        resolve();
    });
}

/**
 * 添加文件修改监听
 * @param filePath
 */
function addWatch(filePath) {
    // 开发环境开启文件监控
    if(typeof NODE_ENV === 'string' && NODE_ENV.toLowerCase() === 'development') {
        if(!watchFiles.some(file => file === filePath)) {
            watchFiles.push(filePath);
            let fullFilePath = path.join(SRC_PATH, filePath);
            fs.watch(fullFilePath, (event) => {
                if(event === 'change') {
                    transTo(filePath);
                }
            });

        }
    }
}

function transTo(srcFile) {
    var srcFilePath = path.join(SRC_PATH, srcFile);
    var targetFilePath = path.join(DIST_PATH, srcFile);
    var srcFileStat = fs.statSync(srcFilePath);
    if(srcFileStat.isDirectory()) {
        // 若目标文件夹不存在，则先创建
        // 对源文件夹再遍历文件夹下的文件
        fs.stat(targetFilePath, function (err, stat) {
            if(err) {
                fs.mkdir(targetFilePath, function () {
                    readDirForOperation(srcFilePath, function (file) {
                        transTo(path.join(srcFile, file));
                    });
                });
            }else {
                readDirForOperation(srcFilePath, function (file) {
                    transTo(path.join(srcFile, file));
                });
            }
        });
    }else if(srcFileStat.isFile()) {
        // 若为文件，则转换成html文件再写入到对应的目标文件路径中
        fs.readFile(srcFilePath, function (err, data) {
            if(err) {
                log(srcFilePath + ' occur a error when read data');
            }else {
                var text = data.toString('utf-8');
                markDownToHtml(text)
                    .then(markDownHtmlText => combineHtmlTemplate(markDownHtmlText, srcFilePath))
                    .then(data => writeToTargetDirectory(targetFilePath, data))
                    .then(() => {
                        addWatch(srcFile);
                    });
            }
        });
    }else{
        log(srcFile + ' is either file or directory');
    }
}

function readDirForOperation(dirPath, operation) {
    fs.readdir(dirPath, function (err, files) {
        if(err) {
            log(srcFile + ' can\'t load as directory');
        }else {
            files.forEach(operation);
        }
    })
}

readDirForOperation(SRC_PATH, transTo);
