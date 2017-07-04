"use strict";
let baseDir = new URL('../', currentScriptSrc).href;
function importAll(...fns) {
    importScripts(...fns.map(fn => new URL(fn, baseDir).href));
}
var window = self;
try {
    importAll('lib/_npm/kaitai-struct-compiler/kaitai-struct-compiler.js', 'lib/_npm/yamljs/yaml.js');
    var compiler = new KaitaiStructCompiler();
    console.log('Kaitai Worker V2!', compiler, methods, YAML);
    var ksy;
    methods.compile = async (ksyCode) => {
        ksy = YAML.parse(ksyCode);
        var releaseCode = await compiler.compile('javascript', ksy, null, false);
        var debugCode = await compiler.compile('javascript', ksy, null, true);
        return { releaseCode, debugCode };
    };
}
catch (e) {
    console.log("Worker error", e);
}
//# sourceMappingURL=KaitaiWorkerV2.js.map