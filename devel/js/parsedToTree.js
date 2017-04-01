define(["require", "exports", "./app.layout", "./app", "./app.worker", "./app.errors"], function (require, exports, app_layout_1, app_1, app_worker_1, app_errors_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
    ;
    class ParsedTreeHandler {
        constructor(jsTreeElement, exportedRoot, ksyTypes) {
            this.jsTreeElement = jsTreeElement;
            this.exportedRoot = exportedRoot;
            this.ksyTypes = ksyTypes;
            this.parsedTreeOpenedNodes = {};
            this.saveOpenedNodesDisabled = false;
            this.nodeDatas = [];
            jsTreeElement.jstree("destroy");
            this.jstree = jsTreeElement.jstree({ core: { data: (node, cb) => this.getNode(node).then(x => cb(x), e => app_errors_1.handleError(e)), themes: { icons: false }, multiple: false, force_text: false } }).jstree(true);
            this.jstree.on = (...args) => this.jstree.element.on(...args);
            this.jstree.off = (...args) => this.jstree.element.off(...args);
            this.jstree.on('keyup.jstree', e => this.jstree.activate_node(e.target.id, null));
        }
        saveOpenedNodes() {
            if (this.saveOpenedNodesDisabled)
                return;
            //parsedTreeOpenedNodes = {};
            //getAllNodes(ui.parsedDataTree).filter(x => x.state.opened).forEach(x => parsedTreeOpenedNodes[x.id] = true);
            //console.log('saveOpenedNodes');
            localStorage.setItem('parsedTreeOpenedNodes', Object.keys(this.parsedTreeOpenedNodes).join(','));
        }
        initNodeReopenHandling() {
            var parsedTreeOpenedNodesStr = localStorage.getItem('parsedTreeOpenedNodes');
            if (parsedTreeOpenedNodesStr)
                parsedTreeOpenedNodesStr.split(',').forEach(x => this.parsedTreeOpenedNodes[x] = true);
            return new Promise((resolve, reject) => {
                this.jstree.on('ready.jstree', e => {
                    this.openNodes(Object.keys(this.parsedTreeOpenedNodes)).then(() => {
                        this.jstree.on('open_node.jstree', (e, te) => {
                            var node = te.node;
                            this.parsedTreeOpenedNodes[this.getNodeId(node)] = true;
                            this.saveOpenedNodes();
                        }).on('close_node.jstree', (e, te) => {
                            var node = te.node;
                            delete this.parsedTreeOpenedNodes[this.getNodeId(node)];
                            this.saveOpenedNodes();
                        });
                        resolve();
                    }, e => reject(e));
                });
            });
        }
        primitiveToText(exported, detailed = true) {
            if (exported.type === ObjectType.Primitive) {
                var value = exported.primitiveValue;
                if (Number.isInteger(value)) {
                    value = s `${value < 0 ? '-' : ''}0x${Math.abs(value).toString(16).toUpperCase()}` + (detailed ? s `<span class="intVal"> = ${value}</span>` : '');
                    if (exported.enumStringValue)
                        value = `${htmlescape(exported.enumStringValue)}` + (detailed ? ` <span class="enumDesc">(${value})</span>` : '');
                }
                else
                    value = s `${value}`;
                return `<span class="primitiveValue">${value}</span>`;
            }
            else if (exported.type === ObjectType.TypedArray) {
                var text = '[';
                for (var i = 0; i < exported.bytes.byteLength; i++) {
                    if (i === 8) {
                        text += ", ...";
                        break;
                    }
                    text += (i === 0 ? '' : ', ') + exported.bytes[i];
                }
                text += ']';
                return s `${text}`;
            }
            else
                throw new Error("primitiveToText: object is not primitive!");
        }
        reprObject(obj) {
            var repr = obj.object.ksyType && obj.object.ksyType["-webide-representation"];
            if (!repr)
                return "";
            function ksyNameToJsName(ksyName) { return ksyName.split('_').map((x, i) => (i === 0 ? x : x.ucFirst())).join(''); }
            return htmlescape(repr).replace(/{(.*?)}/g, (g0, g1) => {
                var currItem = obj;
                var parts = g1.split(':');
                var format = { sep: ', ' };
                if (parts.length > 1)
                    parts[1].split(',').map(x => x.split('=')).forEach(kv => format[kv[0]] = kv.length > 1 ? kv[1] : true);
                parts[0].split('.').forEach(k => {
                    if (!currItem || !currItem.object)
                        currItem = null;
                    else {
                        var child = k === "_parent" ? currItem.parent : currItem.object.fields[ksyNameToJsName(k)];
                        //if (!child)
                        //    console.log('[webrepr] child not found in object', currItem, k);
                        currItem = child;
                    }
                });
                if (!currItem)
                    return "";
                if (currItem.type === ObjectType.Object)
                    return this.reprObject(currItem);
                else if (format.str && currItem.type === ObjectType.TypedArray)
                    return s `"${asciiEncode(currItem.bytes)}"`;
                else if (format.hex && currItem.type === ObjectType.TypedArray)
                    return s `${hexEncode(currItem.bytes)}`;
                else if (format.dec && currItem.type === ObjectType.Primitive && Number.isInteger(currItem.primitiveValue))
                    return s `${currItem.primitiveValue}`;
                else if (currItem.type === ObjectType.Array) {
                    var escapedSep = s `${format.sep}`;
                    return currItem.arrayItems.map(item => this.reprObject(item)).join(escapedSep);
                }
                else
                    return this.primitiveToText(currItem, false);
            });
        }
        addNodeData(data) {
            var idx = this.nodeDatas.length;
            this.nodeDatas.push(data);
            return { idx: idx };
        }
        getNodeData(node) {
            if (!node || !node.data) {
                console.log('no node data', node);
                return null;
            }
            return this.nodeDatas[node.data.idx];
        }
        childItemToNode(item, showProp) {
            var propName = item.path.last();
            var isObject = item.type === ObjectType.Object;
            var isArray = item.type === ObjectType.Array;
            var text;
            if (isArray)
                text = s `${propName}`;
            else if (isObject) {
                var repr = this.reprObject(item);
                text = s `${propName} [<span class="className">${item.object.class}</span>]` + (repr ? `: ${repr}` : '');
            }
            else
                text = (showProp ? s `<span class="propName">${propName}</span> = ` : '') + this.primitiveToText(item);
            return { text: text, children: isObject || isArray, data: this.addNodeData({ exported: item }) };
        }
        exportedToNodes(exported, showProp) {
            if (exported.type === ObjectType.Undefined)
                return [];
            if (exported.type === ObjectType.Primitive || exported.type === ObjectType.TypedArray)
                return [this.childItemToNode(exported, showProp)];
            else if (exported.type === ObjectType.Array) {
                const maxItemToDisplay = 3000;
                //if (exported.arrayItems.length > 3000) {
                //    console.warn("Too much array items to display.");
                //    return [{ text: "Too much array items to display.", children: false, data: addNodeData({ exported: exported }) }];
                //}
                //else
                var result = exported.arrayItems.slice(0, maxItemToDisplay).map((item, i) => this.childItemToNode(item, true));
                if (exported.arrayItems.length > maxItemToDisplay)
                    result.push({ text: "Too much array items to display.", children: false, data: this.addNodeData({ exported: { path: [] } }) });
                return result;
            }
            else if (exported.type === ObjectType.Object) {
                var obj = exported.object;
                return Object.keys(obj.fields).map(fieldName => this.childItemToNode(obj.fields[fieldName], true)).concat(Object.keys(obj.instances).map(propName => ({ text: s `${propName}`, children: true, data: this.addNodeData({ instance: obj.instances[propName], parent: exported }) })));
            }
            else
                throw new Error(`Unknown object type: ${exported.type}`);
        }
        getProp(path) {
            return app_worker_1.workerCall({ type: 'get', args: [path] });
        }
        fillKsyTypes(val) {
            if (val.type === ObjectType.Object) {
                val.object.ksyType = this.ksyTypes[val.object.class];
                Object.keys(val.object.fields).forEach(fieldName => this.fillKsyTypes(val.object.fields[fieldName]));
            }
            else if (val.type === ObjectType.Array)
                val.arrayItems.forEach(item => this.fillKsyTypes(item));
        }
        getNode(node) {
            var isRoot = node.id === '#';
            var nodeData = this.getNodeData(node);
            var expNode = isRoot ? this.exportedRoot : nodeData.exported;
            var isInstance = !expNode;
            var valuePromise = isInstance ? this.getProp(nodeData.instance.path).then(exp => nodeData.exported = exp) : Promise.resolve(expNode);
            return valuePromise.then(exp => {
                if (isRoot || isInstance) {
                    this.fillKsyTypes(exp);
                    var intId = 0;
                    function fillIntervals(exp) {
                        var objects = collectAllObjects(exp);
                        var typedArrays = objects.filter(exp => exp.type === ObjectType.TypedArray && exp.bytes.length > 64);
                        var intervals = objects.filter(exp => (exp.type === ObjectType.Primitive || exp.type === ObjectType.TypedArray) && exp.start < exp.end)
                            .map(exp => ({ start: exp.ioOffset + exp.start, end: exp.ioOffset + exp.end - 1, id: JSON.stringify({ id: intId++, path: exp.path.join('/') }) }))
                            .sort((a, b) => a.start - b.start);
                        var intervalsFiltered = [];
                        if (intervals.length > 0) {
                            intervalsFiltered = [intervals[0]];
                            intervals.slice(1).forEach(int => {
                                if (int.start > intervalsFiltered.last().end)
                                    intervalsFiltered.push(int);
                            });
                        }
                        if (!isInstance) {
                            var nonParsed = [];
                            var lastEnd = -1;
                            intervalsFiltered.forEach(i => {
                                if (i.start !== lastEnd + 1)
                                    nonParsed.push({ start: lastEnd + 1, end: i.start - 1 });
                                lastEnd = i.end;
                            });
                            app_layout_1.ui.unparsedIntSel.setIntervals(nonParsed);
                            app_layout_1.ui.bytesIntSel.setIntervals(typedArrays.map(exp => ({ start: exp.ioOffset + exp.start, end: exp.ioOffset + exp.end - 1 })));
                        }
                        if (intervalsFiltered.length > 400000)
                            console.warn("Too much item for interval tree: " + intervalsFiltered.length);
                        else
                            intervalsFiltered.forEach(i => app_1.itree.add(i.start, i.end, i.id));
                    }
                    fillIntervals(exp);
                    app_layout_1.ui.hexViewer.setIntervalTree(app_1.itree);
                }
                function fillParents(value, parent) {
                    //console.log('fillParents', value.path.join('/'), value, parent);
                    value.parent = parent;
                    if (value.type === ObjectType.Object) {
                        Object.keys(value.object.fields).forEach(fieldName => fillParents(value.object.fields[fieldName], value));
                    }
                    else if (value.type === ObjectType.Array)
                        value.arrayItems.forEach(item => fillParents(item, parent));
                }
                if (!exp.parent)
                    fillParents(exp, nodeData && nodeData.parent);
                var nodes = this.exportedToNodes(exp, true);
                nodes.forEach(node => node.id = this.getNodeId(node));
                return nodes;
            });
        }
        getNodeId(node) {
            var nodeData = this.getNodeData(node);
            return 'inputField_' + (nodeData.exported ? nodeData.exported.path : nodeData.instance.path).join('_');
        }
        openNodes(nodesToOpen) {
            return new Promise((resolve, reject) => {
                var saveOpenedNodesDisabled = true;
                var origAnim = this.jstree.settings.core.animation;
                this.jstree.settings.core.animation = 0;
                //console.log('saveOpenedNodesDisabled = true');
                var openCallCounter = 1;
                var openRound = (e) => {
                    openCallCounter--;
                    //console.log('openRound', openCallCounter, nodesToOpen);
                    var newNodesToOpen = [];
                    var existingNodes = [];
                    nodesToOpen.forEach(nodeId => {
                        var node = this.jstree.get_node(nodeId);
                        if (node) {
                            if (!node.state.opened)
                                existingNodes.push(node);
                        }
                        else
                            newNodesToOpen.push(nodeId);
                    });
                    nodesToOpen = newNodesToOpen;
                    //console.log('existingNodes', existingNodes, 'openCallCounter', openCallCounter);
                    if (existingNodes.length > 0)
                        existingNodes.forEach(node => {
                            openCallCounter++;
                            //console.log(`open_node called on ${node.id}`)
                            this.jstree.open_node(node);
                        });
                    else if (openCallCounter === 0) {
                        //console.log('saveOpenedNodesDisabled = false');
                        saveOpenedNodesDisabled = false;
                        e && this.jstree.off(e);
                        this.jstree.settings.core.animation = origAnim;
                        this.saveOpenedNodes();
                        resolve(nodesToOpen.length === 0);
                    }
                };
                this.jstree.on('open_node.jstree', e => openRound(e));
                openRound(null);
            });
        }
        activatePath(path) {
            var pathParts = path.split('/');
            var expandNodes = [];
            var pathStr = 'inputField';
            for (var i = 0; i < pathParts.length; i++) {
                pathStr += '_' + pathParts[i];
                expandNodes.push(pathStr);
            }
            var activateId = expandNodes.pop();
            return this.openNodes(expandNodes).then(foundAll => {
                //console.log('activatePath', foundAll, activateId);
                this.jstree.activate_node(activateId, null);
                if (foundAll) {
                    var element = $(`#${activateId}`).get(0);
                    if (element)
                        element.scrollIntoView();
                    else {
                        console.log('element not found', activateId);
                    }
                }
                return foundAll;
            });
        }
        ;
    }
    exports.ParsedTreeHandler = ParsedTreeHandler;
});
