/**
 * Created by Yun on 2017/2/28.
 */
let fs = require('fs');
let debug = require('debug')('express-node-start:FileUtils.js');
let FileUtils = {

    // copyFile : function (from, to) {
        // let rs =fs.createReadStream(from);
        // let ws =fs.createWriteStream(to);
        // rs.pipe(ws);
    // },

    copyFileSync : function (from, to) {
        try{
            let fileData = fs.readFileSync(from);
            fs.writeFileSync(to,fileData);
        }catch (e){
            debug(e);
            return false;
        }
        return true;
    }

};

module.exports = FileUtils;