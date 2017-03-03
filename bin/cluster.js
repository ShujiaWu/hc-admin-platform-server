/**
 * Created by Yun on 2017/1/23.
 */

let debug = require('debug')('file-watcher:server');
let cluster = require('cluster');

function startWorker() {
    //使用fork为每个CPU启动一个工作线程
    let worker = cluster.fork();
    debug('集群: Worker %d started', worker.id);
}

if (cluster.isMaster) {
    //主线程
    require('os').cpus().forEach(function () {
        startWorker();
    });
    // 记录所有断开的工作线程。 如果工作线程断开了， 它应该退出
    // 因此我们可以等待 exit 事件然后繁衍一个新工作线程来代替它
    cluster.on('disconnect', function (worker) {
        console.info('集群: Worker %d disconnected from the cluster.',
            worker.id);
    });
    // 当有工作线程死掉（退出） 时， 创建一个工作线程代替它
    cluster.on('exit', function (worker, code, signal) {
        console.warn('集群: Worker %d died with exit code %d (%s)',
            worker.id, code, signal);
        startWorker();
    });
} else {
    // 在这个工作线程上启动我们的应用服务器
    require('./www')();
}