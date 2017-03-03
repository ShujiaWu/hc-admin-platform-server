let express = require('express');
let exphbs = require('express-handlebars');
let path = require('path');
let favicon = require('serve-favicon');
let cookieParser = require('cookie-parser');
let session = require('express-session');
let bodyParser = require('body-parser');
let credentials = require('./credentials');
let compression = require('compression');
let fallback = require('express-history-api-fallback');


let debug = require('debug')('express-node-start:app.js');

let index = require('./routes/index');
let users = require('./routes/users');
let api = require('./routes/api');

let app = express();
// app.set('env','production');

//不提供服务器信息
app.disable('x-powered-by');
//告诉Express你使用了代理
// app.enable('trust proxy');

// gzip压缩
app.use(compression());


/**
 * 设置模板引擎
 */
app.set('views', path.join(__dirname, 'views'));    //设置模板文件存放位置
app.engine('hbs', exphbs({
    extname: '.hbs',                //指定模板的扩展名
    layoutsDir: 'views/layouts/',    //指定模板的默认布局目录
    partialsDir: 'views/partials/',  //指定片段的默认目录
    defaultLayout: 'layout',
    helpers: {
        section: function (name, options) {
            if (!this._sections) {
                this._sections = {};
            }
            this._sections[name] = options.fn(this);
            return null;
        }
    }
}));
app.set('view engine', 'hbs');

// app.set('views', path.join(__dirname, 'views'));    //设置模板文件存放位置
// app.set('view engine', 'hbs');  //设置默认的模板引擎，使用express-handlebars
// app.set('view cache', true);    //使用模板缓存，正式环境默认启用
//另一种写法
// app.set('view engine', 'html');
// app.engine('html', require('hbs')._express);

// app.set('view engine', 'jade');  //使用jade模板


// 设置favicon.ico
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//打印出当前的环境
debug('当前运行环境为：' + app.get('env'));

/**
 * 设置日志输出
 */
switch (app.get('env')) {
    case 'development':
        //测试环境使用紧凑的、彩色的开发日志
        app.use(require('morgan')('dev'));
        break;
    case 'production':
        //正式环境使用按日志循环
        app.use(require('express-logger')({
            path: __dirname + '/log/requests.log'
        }));
        break;
}

/**
 * 中间件
 */
// json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// cookie
app.use(cookieParser(credentials.cookieSecret));
// session
app.use(session({
    secret: credentials.sessionSecret,
    resave: false,
    saveUninitialized: true,
}));


//使用static中间件将一个或多个目录指派为静态资源目录
//注意public对于客户端来说是透明的
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));
// Angular2 目录
// 记得使用express-history-api-fallback
// https://github.com/sebdeckers/express-history-api-fallback
app.use(express.static(path.join(__dirname, 'front')));


/**
 * 测试
 */
// app.locals.showTests = true;


/**
 * 系统异常及重启
 */
//打印多线程中那个线程接收到请求
app.use(function (req, res, next) {
    let cluster = require('cluster');
    if (cluster.isWorker) {
        debug('线程%s接收到请求。', cluster.worker.id);
    }
    next();
});

//创建域,用于处理未捕获的异常
app.use(function (req, res, next) {
    // 为这个请求创建一个域
    let domain = require('domain').create();
    // 处理这个域中的错误
    domain.on('error', function (err) {
        console.error('捕获到域异常：\n', err.stack);
        try {
            // 在 5 秒内进行故障保护关机
            setTimeout(function () {
                console.error('线程退出.');
                process.exit(1);
            }, 5000);
            // 从集群中断开
            let worker = require('cluster').worker;
            if (worker) worker.disconnect();
            // 停止接收新请求
            app.server.close();
            try {
                // 尝试使用 Express 错误路由
                next(err);
            } catch (err) {
                // 如果 Express 错误路由失效， 尝试返回普通文本响应
                console.error('Express error mechanism failed.\n', err.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error.');
            }
        } catch (err) {
            console.error('异常，无法发送500错误。\n', err.stack);
        }
    });

    // 向域中添加请求和响应对象
    domain.add(req);
    domain.add(res);
    // 执行该域中剩余的请求链
    domain.run(next);
});


/**
 * 路由配置
 */
// 路由配置
app.use('/', index);
app.use('/users', users);
app.use('/api', api);
//针对图片进行特殊处理，不进行重定向
app.use(function (req, res, next) {

    switch (true){
        case req.path.startsWith('/images/'):
        case req.path == '/favicon.ico':
            let err = new Error('Not Found');
            err.status = 404;
            next(err);
            break;
        default:
            next();
    }
});
// express-history-api-fallback
app.use(fallback('index.html', { root: path.join(__dirname, 'front') }));


/**
 * 错误处理
 */
app.use(function (req, res, next) {
    // 404处理，并交由错误处理
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function (err, req, res, next) {
    // app.locals属性来存储本地变量
    // 设置locals, 只在开发环境下听过错误信息
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // 向浏览器发送错误页面
    // res.type('text/html');   //设置返回数据的类型，默认是text/html
    res.status(err.status || 500);  //设置状态码
    res.render('error', {
        layout: 'layout' //指定了模板，默认可以不指定
    });
});

module.exports = app;