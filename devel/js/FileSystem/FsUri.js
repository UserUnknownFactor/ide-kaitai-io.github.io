System.register(["../utils/TestHelper"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var TestHelper_1, FsUri, FsUriTests;
    return {
        setters: [
            function (TestHelper_1_1) {
                TestHelper_1 = TestHelper_1_1;
            }
        ],
        execute: function () {
            /**
             * Rules:
             *  - path format example: <fsScheme>://<fsData>/<folder>/<subfolder>/<file>
             *  - if type == "directory" then path.endswith($`/{name}/`) === true
             *     - except for root where path === "/"
             *  - if type == "file" then path.endswith($`/{name}`) === true
             */
            FsUri = class FsUri {
                constructor(uri, fsDataLen = 0, scheme = null) {
                    this.uri = uri;
                    var uriParts = uri.split("://", 2);
                    this.fsScheme = uriParts.length === 2 ? uriParts[0] : scheme;
                    if (uriParts.length === 1) {
                        this.fsScheme = scheme;
                        if (this.fsScheme)
                            this.uri = `${this.fsScheme}://${uri}`;
                    }
                    else {
                        this.fsScheme = uriParts[0];
                        if (scheme && this.fsScheme !== scheme)
                            throw Error(`Expected URI with scheme "${scheme}", got "${this.uri}"`);
                    }
                    var pathParts = uriParts.last().split("/");
                    this.fsData = pathParts.slice(0, fsDataLen);
                    this.path = "/" + pathParts.slice(Math.max(fsDataLen, 1)).join("/");
                    this.type = this.path.endsWith("/") ? "directory" : "file";
                    var usableLen = this.path.length - 1 - (this.type === "directory" ? 1 : 0);
                    var split = this.path.lastIndexOf("/", usableLen);
                    this.name = this.path.substring(split + 1, usableLen + 1);
                    this.parentPath = this.path.substr(0, split + 1);
                }
                addPath(childPath) {
                    if (this.type === "file")
                        throw new Error("You cannot add a child path to a file uri.");
                    return new FsUri(this.uri + childPath);
                }
                changePath(newPath) {
                    return new FsUri((this.fsScheme ? `${this.fsScheme}://` : "") +
                        `${this.fsData.join("/")}${newPath}`, this.fsData.length);
                }
                static getChildNames(flatPathList, parentPath) {
                    var itemNames = {};
                    flatPathList.filter(x => x.startsWith(parentPath)).forEach(key => {
                        var keyParts = key.substr(parentPath.length).split("/");
                        var name = keyParts[0] + (keyParts.length === 1 ? "" : "/");
                        itemNames[name] = true;
                    });
                    return Object.keys(itemNames);
                }
                static getChildUris(flatPathList, parentUri) {
                    return this.getChildNames(flatPathList, parentUri.path)
                        .map(name => new FsUri(parentUri.uri + name, parentUri.fsData.length, parentUri.fsScheme));
                }
            };
            exports_1("FsUri", FsUri);
            FsUriTests = class FsUriTests {
                static run() {
                    TestHelper_1.TestHelper.assertEquals(new FsUri("github://user/repo/", 2), { "uri": "github://user/repo/", "providerName": "github", "providerData": ["user", "repo"],
                        "path": "/", "type": "directory", "name": "/", "parentPath": "/" });
                    TestHelper_1.TestHelper.assertEquals(new FsUri("github://user/repo/folder/", 2), { "uri": "github://user/repo/folder/", "providerName": "github", "providerData": ["user", "repo"],
                        "path": "/folder/", "type": "directory", "name": "folder", "parentPath": "/" });
                    TestHelper_1.TestHelper.assertEquals(new FsUri("github://user/repo/folder/file", 2), { "uri": "github://user/repo/folder/file", "providerName": "github", "providerData": ["user", "repo"],
                        "path": "/folder/file", "type": "file", "name": "file", "parentPath": "/folder/" });
                }
            };
            exports_1("FsUriTests", FsUriTests);
        }
    };
});
//# sourceMappingURL=FsUri.js.map