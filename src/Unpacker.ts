import images = require('images');
import fs = require('fs');
import path = require('path');
import { ITrimData, ITrimItemData, IParser } from './core/IParser';
import { ParserFactory } from './core/ParserFactory';
import { parserCfg } from './config/parserCfg';

export class Unpacker {

    constructor(fileOrDir: string, packType: string) {
        if (fs.statSync(fileOrDir).isDirectory())
            this.parseDir(fileOrDir, packType);
        else
            this.parseFile(fileOrDir, packType);
    }


    parseDir(dir: string, packType: string) {
        let { ext } = parserCfg[packType];
        let parser: IParser = ParserFactory.getParser(packType);
        fs.readdir(dir, (err, files) => {
            if (err) {
                console.error(err);
            } else {
                files.forEach((filename) => {
                    let filePath = path.join(dir, filename);
                    if (filename.match(ext)) {
                        this.parseFile(filePath, parser);
                    } else if (fs.statSync(filePath).isDirectory()) {
                        this.parseDir(filePath, packType);
                    }
                });
            }
        });
    }

    async parseFile(filePath: string, parserTypeOrIParser: string | IParser) {
        let parser: IParser;
        if (typeof parserTypeOrIParser === "string")
            parser = ParserFactory.getParser(parserTypeOrIParser);
        else
            parser = parserTypeOrIParser;

        try {
            let data = await parser.parse(filePath);
            this.trim(data);
        } catch (e) {
            console.error(e);
        }
    }



    trim(trimData: ITrimData) {
        let atlasPath = trimData.atlasPath;
        let dir = atlasPath.substring(0, atlasPath.lastIndexOf('.'))
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir);
        let atlas = images(atlasPath);
        let item: ITrimItemData, sImg;
        for (let i = 0; i < trimData.itemDatas.length; i++) {
            item = trimData.itemDatas[i];
            let arr = item.frame;
            let img = images(atlas, arr[0], arr[1], arr[2], arr[3]);

            if (item.rotated)
                img.rotate(item.degree);

            if (item.sourceColorRect[2] != item.sourceSize[0] || item.sourceColorRect[3] != item.sourceSize[1]) {
                sImg = images(item.sourceSize[0], item.sourceSize[1]);
                sImg.draw(img, item.sourceColorRect[0], item.sourceColorRect[1]);
            } else {
                sImg = img;
            }
            sImg.save(path.join(dir, item.name));
        }
        console.log(`ok!! unpack:${atlasPath}`);
    }
}

//---------------------

/**
 * 解包图集，裁剪还原小图片
 * @param fileOrDir 配置文件绝对路径或文件目录（允许目录嵌套），支持批量处理
 * @param packType 文件类型，非文件后缀，仅提供了cocos支持，类型为 "cc"，可通过实现 IParser 接口扩展更多类型
 */
export function unpack(fileOrDir: string, packType: string) {
    new Unpacker(fileOrDir, packType);
}

/**
 * 注册自定义解析器
 * @param type string类型
 * @param parserCls 实现了IParser接口的类
 * @param ext 文件扩展名 (".plist")
 */
export function registerParser(type: string, parserCls: any, ext:string) {
    parserCfg[type] = { parser: parserCls, ext: ext };
}

export let unpack_tp_root:string = path.resolve(__dirname, "..");

//-------check binding.node------

var child_process = require('child_process');

(() => {
    if (!fs.existsSync(path.resolve(unpack_tp_root, "node_modules", "images", "build"))) {
        let dest = path.resolve(unpack_tp_root, "node_modules", "images");
        child_process.spawn('cp', ['-r', path.resolve(unpack_tp_root, "lib", "build"), dest]);        
        console.log(`has copied binding.node to ${path.resolve(dest, 'build')}! if run error, please upgrade nodejs to lastest!`)
    }
})()
