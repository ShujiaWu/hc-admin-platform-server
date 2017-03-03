/**
 * Api接口
 * Created by Yun on 2017/2/14.
 */
let express = require('express');
let marked = require('marked');
let path = require('path');
let fs = require('fs');
let multer = require('multer');
let FileUtils = require("../utils/FileUtils");

let upload = multer({ dest: 'public/uploads/' });

let debug = require('debug')('express-node-start:api.js');

let router = express.Router();
let root = process.cwd();


router.get('/article', function (req, res, next) {
    let dir = fs.readdirSync(path.join(root,'md-file'));

    let arr = dir.filter(function (cValue, index, array) {
       return fs.lstatSync(path.join(root,'md-file',cValue)).isDirectory();
    });
    let result = {
      list: arr
    };
    res.json(result);
});


/**
 * 获取分类
 */
router.get('/article/:category', function (req, res, next) {
    let targetDir = path.join(root,'md-file',req.params['category']);
    let result = {};
    let resultCode = 200;
    if(!fs.existsSync(targetDir)){
        //文件夹不存在
        resultCode = 400;
        result.code = 'DIR_NOT_EXITS';
        result.message = '目录不存在';
    }else{
        let dir = fs.readdirSync(targetDir);
        let list = dir.filter(function (cValue, index, array) {
            return !fs.lstatSync(path.join(targetDir,cValue)).isDirectory();
        });

        result.list = list.map(function (cValue, index, array) {
            return cValue.substring(0,cValue.indexOf('.md'));
        });
    }

    res.status(resultCode).json(result);
});

/**
 * 新增分类
 */
router.put('/article/:category', function (req, res, next) {
    let newCategoryName = req.params['category'];
    let fullPath = path.join(root, 'md-file',newCategoryName);
    let result = {};
    let resultCode = 200;
    if(fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()){
        // 分类已经存在
        resultCode = 400;
        result.code = 'DIR_HAS_EXITS';
        result.message = '目录已经存在';
    }else{
        try{
            fs.mkdirSync(fullPath);
            result.categoryName = req.params['category'];
        }catch (e){
            debug(e);
            resultCode = 400;
            result.code = 'DIR_HAS_EXITS';
            result.message = '目录已经存在';
        }
    }
    res.status(resultCode).json(result);
});
/**
 * 修改分类
 */
router.post('/article/:category', function (req, res, next) {
    let categoryName = req.params['category'];
    let oldFullPath = path.join(root, 'md-file',categoryName);
    let newCategoryName = req.body['newName'];
    let newFullPath = path.join(root, 'md-file',newCategoryName);

    let result = {};
    let resultCode = 200;
    console.log(fs.existsSync(oldFullPath));
    console.log(fs.lstatSync(oldFullPath).isDirectory());
    if(fs.existsSync(oldFullPath) && fs.lstatSync(oldFullPath).isDirectory()){
        // 分类存在
        try{
            fs.renameSync(oldFullPath,newFullPath);
            result.oldCategory = categoryName;
            result.newCategory = newCategoryName;
        }catch (e){
            resultCode = 400;
            result.code = 'DIR_RENAME_ERROR';
            result.message = '修改文件夹名失败';
        }
    }else{
        resultCode = 400;
        result.code = 'DIR_NOT_EXIT';
        result.message = '文件夹不存在';
    }
    res.status(resultCode).json(result);
});

/**
 * 删除分类
 */
router.delete('/article/:category', function (req, res, next) {
    let categoryName = req.params['category'];
    let fullPath = path.join(root, 'md-file',categoryName);
    let result = {};
    let resultCode = 200;
    if(fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()){
        try{
            fs.rmdirSync(fullPath);
            result.category = categoryName;
        }catch (e){
            resultCode = 400;
            result.code = 'DIR_DELETE_ERROR';
            result.message = '删除文件夹失败';
        }
    }else{
        resultCode = 400;
        result.code = 'DIR_NOT_EXIT';
        result.message = '文件夹不存在';
    }
    res.status(resultCode).json(result);
});


/**
 * 获取文章内容
 */
router.get('/article/:category/:name', function (req, res, next){
    let targetFile = path.join(root,'md-file',req.params['category'],req.params['name']+'.md');
    let result = {};
    let resultCode = 200;
    if(!fs.existsSync(targetFile)){
        //文件夹不存在
        resultCode = 400;
        result.code = 'FILE_NOT_EXITS';
        result.message = '文件不存在';
    }else{
        let fileContent;
        try{
            fileContent = fs.readFileSync(targetFile,'utf-8');
        }catch (e){
            resultCode = 400;
            result.code = 'FILE_READ_ERROR';
            result.message = '文件读取错误';
        }
        try{
            let source = marked(fileContent);

            result.result = source.replace(/<pre><code>([\w\W]*?)<\/code><\/pre>/g, function(str, p1) {
                return '<pre class="prettyprint">' + p1 + '</pre>';
            }).replace(/<table>/g,'<table class="table table-hover">');
        }catch (e) {
            console.log(e);
            resultCode = 400;
            result.code = 'FILE_CONVERT_ERROR';
            result.message = '文件转换错误';
        }
    }

    res.status(resultCode).json(result);
});


router.post('/upload/:category',upload.fields([{name: 'file'}]),function (req, res, next) {
    // console.log(req.files);
    // console.log(req.file);
    let result = {};
    let resultCode = 200;
    result.successList = [];
    result.failList = [];
    if (req.files['file'].length){
        console.log('复制文件');
        for(let i = 0; i < req.files['file'].length; i++){
            // let rs =fs.createReadStream(path.join(root,req.files['file'][0].path));
            // let ws =fs.createWriteStream(path.join(root,'md-file',req.files['file'][0].originalname));
            // rs.pipe(ws);
            try {
                let from = path.join(root,req.files['file'][i].path);
                let to = path.join(root,'md-file',req.param('category'),req.files['file'][i].originalname);
                FileUtils.copyFileSync(from, to);
                fs.unlinkSync(from);
                result.successList.push(req.files['file'][i].originalname);
            } catch (e){
                resultCode = 400;
                result.code = 'FILE_UPLOAD_ERROR';
                result.message = '文件上传失败';
                result.failList.push(req.files['file'][i].originalname);
            }

        }
    }
    res.status(resultCode).json(result);
});

/**
 * 删除分类
 */
router.delete('/article/:category/:article', function (req, res, next) {
    let category = req.params['category'];
    let article = req.params['article'];
    let fullPath = path.join(root, 'md-file',category,article + '.md');
    let result = {};
    let resultCode = 200;

    if(fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()){
        try{
            fs.unlinkSync(fullPath);
            result.article = article;
        }catch (e){
            resultCode = 400;
            result.code = 'DIR_DELETE_ERROR';
            result.message = '删除文件失败';
        }
    }else{
        resultCode = 400;
        result.code = 'FILE_NOT_EXIT';
        result.message = '文件不存在';
    }
    res.status(resultCode).json(result);
});



// router.post('/', function (req, res, next) {
//     console.log(req.files);
//     console.log(req.file);
//     // if (!res.locals.partials) {
//     //     res.locals.partials = {};
//     // }
//     // console.log('接收到客户端提交的请求：',req.body['id'],'----',req.body['name']);
//     res.json({
//         result:'Post成功'
//     });
// });

//错误处理
router.use(function (req, res, next) {
    // res.redirect(303,'/index.html');

    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

module.exports = router;