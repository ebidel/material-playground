(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var settings = window.Polymer || {};
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (settings[o[0]] = o[1] || true);
}
settings.wantShadow = settings.dom === 'shadow';
settings.hasShadow = Boolean(Element.prototype.createShadowRoot);
settings.nativeShadow = settings.hasShadow && !window.ShadowDOMPolyfill;
settings.useShadow = settings.wantShadow && settings.hasShadow;
settings.hasNativeImports = Boolean('import' in document.createElement('link'));
settings.useNativeImports = settings.hasNativeImports;
settings.useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
settings.useNativeShadow = settings.useShadow && settings.nativeShadow;
settings.usePolyfillProto = !settings.useNativeCustomElements && !Object.__proto__;
return settings;
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
(function () {
'use strict';
var settings = Polymer.Settings;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
if (!settings.lazyRegister) {
this.ensureRegisterFinished();
}
},
createdCallback: function () {
if (!this.__hasRegisterFinished) {
this._ensureRegisterFinished(this.__proto__);
}
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
ensureRegisterFinished: function () {
this._ensureRegisterFinished(this);
},
_ensureRegisterFinished: function (proto) {
if (proto.__hasRegisterFinished !== proto.is) {
proto.__hasRegisterFinished = proto.is;
if (proto._finishRegisterFeatures) {
proto._finishRegisterFeatures();
}
proto._doBehavior('registered');
}
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
var n$ = Object.getOwnPropertyNames(api);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, api, prototype);
}
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
}());
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.version = '1.4.0';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();
(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.extend(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());
(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.extend(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
var path = this.event.path;
if (!Array.isArray(path)) {
path = Array.prototype.slice.call(path);
}
return path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend' && !ev.__polymerSimulatedTouch) {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
optAsync = Boolean(optAsync);
if (optAsync) {
l.setAttribute('async', '');
}
var self = this;
if (onload) {
l.onload = function (e) {
return onload.call(self, e);
};
}
if (onerror) {
l.onerror = function (e) {
return onerror.call(self, e);
};
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
_dataEventCache: {},
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, value, fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
var attr = Polymer.CaseMap.camelToDashCase(p);
if (attr[0] === '-') {
this._warn(this._logf('_addPropertyEffects', 'Property ' + p + ' cannot be reflected to attribute ' + attr + ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'));
} else {
this._addPropertyEffect(p, 'reflect', { attribute: attr });
}
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
if (note.kind === 'attribute' && note.name[0] === '-') {
this._warn(this._logf('_addAnnotationEffect', 'Cannot set attribute ' + note.name + ' because "-" is not a valid attribute starting character'));
} else {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = this._modelForPath(arg);
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
var pinfo;
if (!node._propertyInfo || !(pinfo = node._propertyInfo[property]) || !pinfo.readOnly) {
this.__setProperty(property, value, false, node);
}
}
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (!usePolyfillProto && this.hasOwnProperty(i) && this._propertyEffects && this._propertyEffects[i]) {
config[i] = this[i];
delete this[i];
} else if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRule(this.rulesForStyle(s), styleRuleCallback, keyframesRuleCallback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback) {
if (!node) {
return;
}
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback);
}
}
},
applyCss: function (cssText, moniker, target, contextNode) {
var style = this.createScopeStyle(cssText, moniker);
target = target || document.head;
var after = contextNode && contextNode.nextSibling || target.firstChild;
this.__lastHeadApplyNode = style;
return target.insertBefore(style, after);
},
createScopeStyle: function (cssText, moniker) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
return style;
},
__lastHeadApplyNode: null,
applyStylePlaceHolder: function (moniker) {
var placeHolder = document.createComment(' Shady DOM styles for ' + moniker + ' ');
var after = this.__lastHeadApplyNode ? this.__lastHeadApplyNode.nextSibling : null;
var scope = document.head;
scope.insertBefore(placeHolder, after || scope.firstChild);
this.__lastHeadApplyNode = placeHolder;
return placeHolder;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (!nativeShadow) {
this._scopeStyle = styleUtil.applyStylePlaceHolder(this.is);
}
},
_prepShimStyles: function () {
if (this._template) {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow;
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
this._prepStyleProperties();
if (!this._needsStyleProperties() && this._styles.length) {
styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null, this._scopeStyle);
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {}, keyframes = [];
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!nativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!nativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,()]*)|(?:[^;()]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles) : null;
},
customStyle: null,
getComputedStyleValue: function (property) {
return this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepStyles();
},
_finishRegisterFeatures: function () {
this._prepTemplate();
this._prepShimStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_apply: function (deferProperties) {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
var self = this;
var fn = function fn() {
self._applyCustomProperties(e);
};
if (this._pendingApplyProperties) {
cancelAnimationFrame(this._pendingApplyProperties);
this._pendingApplyProperties = null;
}
if (deferProperties) {
this._pendingApplyProperties = requestAnimationFrame(fn);
} else {
fn();
}
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: true,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
(function () {
var metaDatas = {};
var metaArrays = {};
var singleton = null;
Polymer.IronMeta = Polymer({
is: 'iron-meta',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
observer: '_valueChanged'
},
self: {
type: Boolean,
observer: '_selfChanged'
},
list: {
type: Array,
notify: true
}
},
hostAttributes: { hidden: true },
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
case 'value':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key, old) {
this._resetRegistration(old);
},
_valueChanged: function (value) {
this._resetRegistration(this.key);
},
_selfChanged: function (self) {
if (self) {
this.value = this;
}
},
_typeChanged: function (type) {
this._unregisterKey(this.key);
if (!metaDatas[type]) {
metaDatas[type] = {};
}
this._metaData = metaDatas[type];
if (!metaArrays[type]) {
metaArrays[type] = [];
}
this.list = metaArrays[type];
this._registerKeyValue(this.key, this.value);
},
byKey: function (key) {
return this._metaData && this._metaData[key];
},
_resetRegistration: function (oldKey) {
this._unregisterKey(oldKey);
this._registerKeyValue(this.key, this.value);
},
_unregisterKey: function (key) {
this._unregister(key, this._metaData, this.list);
},
_registerKeyValue: function (key, value) {
this._register(key, value, this._metaData, this.list);
},
_register: function (key, value, data, list) {
if (key && data && value !== undefined) {
data[key] = value;
list.push(value);
}
},
_unregister: function (key, data, list) {
if (key && data) {
if (key in data) {
var value = data[key];
delete data[key];
this.arrayDelete(list, value);
}
}
}
});
Polymer.IronMeta.getIronMeta = function getIronMeta() {
if (singleton === null) {
singleton = new Polymer.IronMeta();
}
return singleton;
};
Polymer.IronMetaQuery = Polymer({
is: 'iron-meta-query',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
readOnly: true
},
list: {
type: Array,
notify: true
}
},
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key) {
this._setValue(this._metaData && this._metaData[key]);
},
_typeChanged: function (type) {
this._metaData = metaDatas[type];
this.list = metaArrays[type];
if (this.key) {
this._keyChanged(this.key);
}
},
byKey: function (key) {
return this._metaData && this._metaData[key];
}
});
}());
Polymer({
is: 'iron-icon',
properties: {
icon: {
type: String,
observer: '_iconChanged'
},
theme: {
type: String,
observer: '_updateIcon'
},
src: {
type: String,
observer: '_srcChanged'
},
_meta: {
value: Polymer.Base.create('iron-meta', { type: 'iconset' }),
observer: '_updateIcon'
}
},
_DEFAULT_ICONSET: 'icons',
_iconChanged: function (icon) {
var parts = (icon || '').split(':');
this._iconName = parts.pop();
this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
this._updateIcon();
},
_srcChanged: function (src) {
this._updateIcon();
},
_usesIconset: function () {
return this.icon || !this.src;
},
_updateIcon: function () {
if (this._usesIconset()) {
if (this._img && this._img.parentNode) {
Polymer.dom(this.root).removeChild(this._img);
}
if (this._iconName === '') {
if (this._iconset) {
this._iconset.removeIcon(this);
}
} else if (this._iconsetName && this._meta) {
this._iconset = this._meta.byKey(this._iconsetName);
if (this._iconset) {
this._iconset.applyIcon(this, this._iconName, this.theme);
this.unlisten(window, 'iron-iconset-added', '_updateIcon');
} else {
this.listen(window, 'iron-iconset-added', '_updateIcon');
}
}
} else {
if (this._iconset) {
this._iconset.removeIcon(this);
}
if (!this._img) {
this._img = document.createElement('img');
this._img.style.width = '100%';
this._img.style.height = '100%';
this._img.draggable = false;
}
this._img.src = this.src;
Polymer.dom(this.root).appendChild(this._img);
}
}
});
Polymer({
is: 'iron-iconset-svg',
properties: {
name: {
type: String,
observer: '_nameChanged'
},
size: {
type: Number,
value: 24
}
},
attached: function () {
this.style.display = 'none';
},
getIconNames: function () {
this._icons = this._createIconMap();
return Object.keys(this._icons).map(function (n) {
return this.name + ':' + n;
}, this);
},
applyIcon: function (element, iconName) {
element = element.root || element;
this.removeIcon(element);
var svg = this._cloneIcon(iconName);
if (svg) {
var pde = Polymer.dom(element);
pde.insertBefore(svg, pde.childNodes[0]);
return element._svgIcon = svg;
}
return null;
},
removeIcon: function (element) {
if (element._svgIcon) {
Polymer.dom(element).removeChild(element._svgIcon);
element._svgIcon = null;
}
},
_nameChanged: function () {
new Polymer.IronMeta({
type: 'iconset',
key: this.name,
value: this
});
this.async(function () {
this.fire('iron-iconset-added', this, { node: window });
});
},
_createIconMap: function () {
var icons = Object.create(null);
Polymer.dom(this).querySelectorAll('[id]').forEach(function (icon) {
icons[icon.id] = icon;
});
return icons;
},
_cloneIcon: function (id) {
this._icons = this._icons || this._createIconMap();
return this._prepareSvgClone(this._icons[id], this.size);
},
_prepareSvgClone: function (sourceSvg, size) {
if (sourceSvg) {
var content = sourceSvg.cloneNode(true), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
svg.setAttribute('viewBox', viewBox);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
svg.appendChild(content).removeAttribute('id');
return svg;
}
return null;
}
});
(function () {
'use strict';
var KEY_IDENTIFIER = {
'U+0008': 'backspace',
'U+0009': 'tab',
'U+001B': 'esc',
'U+0020': 'space',
'U+007F': 'del'
};
var KEY_CODE = {
8: 'backspace',
9: 'tab',
13: 'enter',
27: 'esc',
33: 'pageup',
34: 'pagedown',
35: 'end',
36: 'home',
32: 'space',
37: 'left',
38: 'up',
39: 'right',
40: 'down',
46: 'del',
106: '*'
};
var MODIFIER_KEYS = {
'shift': 'shiftKey',
'ctrl': 'ctrlKey',
'alt': 'altKey',
'meta': 'metaKey'
};
var KEY_CHAR = /[a-z0-9*]/;
var IDENT_CHAR = /U\+/;
var ARROW_KEY = /^arrow/;
var SPACE_KEY = /^space(bar)?/;
var ESC_KEY = /^escape$/;
function transformKey(key, noSpecialChars) {
var validKey = '';
if (key) {
var lKey = key.toLowerCase();
if (lKey === ' ' || SPACE_KEY.test(lKey)) {
validKey = 'space';
} else if (ESC_KEY.test(lKey)) {
validKey = 'esc';
} else if (lKey.length == 1) {
if (!noSpecialChars || KEY_CHAR.test(lKey)) {
validKey = lKey;
}
} else if (ARROW_KEY.test(lKey)) {
validKey = lKey.replace('arrow', '');
} else if (lKey == 'multiply') {
validKey = '*';
} else {
validKey = lKey;
}
}
return validKey;
}
function transformKeyIdentifier(keyIdent) {
var validKey = '';
if (keyIdent) {
if (keyIdent in KEY_IDENTIFIER) {
validKey = KEY_IDENTIFIER[keyIdent];
} else if (IDENT_CHAR.test(keyIdent)) {
keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
validKey = String.fromCharCode(keyIdent).toLowerCase();
} else {
validKey = keyIdent.toLowerCase();
}
}
return validKey;
}
function transformKeyCode(keyCode) {
var validKey = '';
if (Number(keyCode)) {
if (keyCode >= 65 && keyCode <= 90) {
validKey = String.fromCharCode(32 + keyCode);
} else if (keyCode >= 112 && keyCode <= 123) {
validKey = 'f' + (keyCode - 112);
} else if (keyCode >= 48 && keyCode <= 57) {
validKey = String(keyCode - 48);
} else if (keyCode >= 96 && keyCode <= 105) {
validKey = String(keyCode - 96);
} else {
validKey = KEY_CODE[keyCode];
}
}
return validKey;
}
function normalizedKeyForEvent(keyEvent, noSpecialChars) {
return transformKey(keyEvent.key, noSpecialChars) || transformKeyIdentifier(keyEvent.keyIdentifier) || transformKeyCode(keyEvent.keyCode) || transformKey(keyEvent.detail.key, noSpecialChars) || '';
}
function keyComboMatchesEvent(keyCombo, event) {
var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
return keyEvent === keyCombo.key && (!keyCombo.hasModifiers || !!event.shiftKey === !!keyCombo.shiftKey && !!event.ctrlKey === !!keyCombo.ctrlKey && !!event.altKey === !!keyCombo.altKey && !!event.metaKey === !!keyCombo.metaKey);
}
function parseKeyComboString(keyComboString) {
if (keyComboString.length === 1) {
return {
combo: keyComboString,
key: keyComboString,
event: 'keydown'
};
}
return keyComboString.split('+').reduce(function (parsedKeyCombo, keyComboPart) {
var eventParts = keyComboPart.split(':');
var keyName = eventParts[0];
var event = eventParts[1];
if (keyName in MODIFIER_KEYS) {
parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
parsedKeyCombo.hasModifiers = true;
} else {
parsedKeyCombo.key = keyName;
parsedKeyCombo.event = event || 'keydown';
}
return parsedKeyCombo;
}, { combo: keyComboString.split(':').shift() });
}
function parseEventString(eventString) {
return eventString.trim().split(' ').map(function (keyComboString) {
return parseKeyComboString(keyComboString);
});
}
Polymer.IronA11yKeysBehavior = {
properties: {
keyEventTarget: {
type: Object,
value: function () {
return this;
}
},
stopKeyboardEventPropagation: {
type: Boolean,
value: false
},
_boundKeyHandlers: {
type: Array,
value: function () {
return [];
}
},
_imperativeKeyBindings: {
type: Object,
value: function () {
return {};
}
}
},
observers: ['_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'],
keyBindings: {},
registered: function () {
this._prepKeyBindings();
},
attached: function () {
this._listenKeyEventListeners();
},
detached: function () {
this._unlistenKeyEventListeners();
},
addOwnKeyBinding: function (eventString, handlerName) {
this._imperativeKeyBindings[eventString] = handlerName;
this._prepKeyBindings();
this._resetKeyEventListeners();
},
removeOwnKeyBindings: function () {
this._imperativeKeyBindings = {};
this._prepKeyBindings();
this._resetKeyEventListeners();
},
keyboardEventMatchesKeys: function (event, eventString) {
var keyCombos = parseEventString(eventString);
for (var i = 0; i < keyCombos.length; ++i) {
if (keyComboMatchesEvent(keyCombos[i], event)) {
return true;
}
}
return false;
},
_collectKeyBindings: function () {
var keyBindings = this.behaviors.map(function (behavior) {
return behavior.keyBindings;
});
if (keyBindings.indexOf(this.keyBindings) === -1) {
keyBindings.push(this.keyBindings);
}
return keyBindings;
},
_prepKeyBindings: function () {
this._keyBindings = {};
this._collectKeyBindings().forEach(function (keyBindings) {
for (var eventString in keyBindings) {
this._addKeyBinding(eventString, keyBindings[eventString]);
}
}, this);
for (var eventString in this._imperativeKeyBindings) {
this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
}
for (var eventName in this._keyBindings) {
this._keyBindings[eventName].sort(function (kb1, kb2) {
var b1 = kb1[0].hasModifiers;
var b2 = kb2[0].hasModifiers;
return b1 === b2 ? 0 : b1 ? -1 : 1;
});
}
},
_addKeyBinding: function (eventString, handlerName) {
parseEventString(eventString).forEach(function (keyCombo) {
this._keyBindings[keyCombo.event] = this._keyBindings[keyCombo.event] || [];
this._keyBindings[keyCombo.event].push([
keyCombo,
handlerName
]);
}, this);
},
_resetKeyEventListeners: function () {
this._unlistenKeyEventListeners();
if (this.isAttached) {
this._listenKeyEventListeners();
}
},
_listenKeyEventListeners: function () {
Object.keys(this._keyBindings).forEach(function (eventName) {
var keyBindings = this._keyBindings[eventName];
var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);
this._boundKeyHandlers.push([
this.keyEventTarget,
eventName,
boundKeyHandler
]);
this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
}, this);
},
_unlistenKeyEventListeners: function () {
var keyHandlerTuple;
var keyEventTarget;
var eventName;
var boundKeyHandler;
while (this._boundKeyHandlers.length) {
keyHandlerTuple = this._boundKeyHandlers.pop();
keyEventTarget = keyHandlerTuple[0];
eventName = keyHandlerTuple[1];
boundKeyHandler = keyHandlerTuple[2];
keyEventTarget.removeEventListener(eventName, boundKeyHandler);
}
},
_onKeyBindingEvent: function (keyBindings, event) {
if (this.stopKeyboardEventPropagation) {
event.stopPropagation();
}
if (event.defaultPrevented) {
return;
}
for (var i = 0; i < keyBindings.length; i++) {
var keyCombo = keyBindings[i][0];
var handlerName = keyBindings[i][1];
if (keyComboMatchesEvent(keyCombo, event)) {
this._triggerKeyHandler(keyCombo, handlerName, event);
if (event.defaultPrevented) {
return;
}
}
}
},
_triggerKeyHandler: function (keyCombo, handlerName, keyboardEvent) {
var detail = Object.create(keyCombo);
detail.keyboardEvent = keyboardEvent;
var event = new CustomEvent(keyCombo.event, {
detail: detail,
cancelable: true
});
this[handlerName].call(this, event);
if (event.defaultPrevented) {
keyboardEvent.preventDefault();
}
}
};
}());
Polymer.IronControlState = {
properties: {
focused: {
type: Boolean,
value: false,
notify: true,
readOnly: true,
reflectToAttribute: true
},
disabled: {
type: Boolean,
value: false,
notify: true,
observer: '_disabledChanged',
reflectToAttribute: true
},
_oldTabIndex: { type: Number },
_boundFocusBlurHandler: {
type: Function,
value: function () {
return this._focusBlurHandler.bind(this);
}
}
},
observers: ['_changedControlState(focused, disabled)'],
ready: function () {
this.addEventListener('focus', this._boundFocusBlurHandler, true);
this.addEventListener('blur', this._boundFocusBlurHandler, true);
},
_focusBlurHandler: function (event) {
if (event.target === this) {
this._setFocused(event.type === 'focus');
} else if (!this.shadowRoot && !this.isLightDescendant(event.target)) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
},
_disabledChanged: function (disabled, old) {
this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
this.style.pointerEvents = disabled ? 'none' : '';
if (disabled) {
this._oldTabIndex = this.tabIndex;
this.focused = false;
this.tabIndex = -1;
this.blur();
} else if (this._oldTabIndex !== undefined) {
this.tabIndex = this._oldTabIndex;
}
},
_changedControlState: function () {
if (this._controlStateChanged) {
this._controlStateChanged();
}
}
};
Polymer.IronButtonStateImpl = {
properties: {
pressed: {
type: Boolean,
readOnly: true,
value: false,
reflectToAttribute: true,
observer: '_pressedChanged'
},
toggles: {
type: Boolean,
value: false,
reflectToAttribute: true
},
active: {
type: Boolean,
value: false,
notify: true,
reflectToAttribute: true
},
pointerDown: {
type: Boolean,
readOnly: true,
value: false
},
receivedFocusFromKeyboard: {
type: Boolean,
readOnly: true
},
ariaActiveAttribute: {
type: String,
value: 'aria-pressed',
observer: '_ariaActiveAttributeChanged'
}
},
listeners: {
down: '_downHandler',
up: '_upHandler',
tap: '_tapHandler'
},
observers: [
'_detectKeyboardFocus(focused)',
'_activeChanged(active, ariaActiveAttribute)'
],
keyBindings: {
'enter:keydown': '_asyncClick',
'space:keydown': '_spaceKeyDownHandler',
'space:keyup': '_spaceKeyUpHandler'
},
_mouseEventRe: /^mouse/,
_tapHandler: function () {
if (this.toggles) {
this._userActivate(!this.active);
} else {
this.active = false;
}
},
_detectKeyboardFocus: function (focused) {
this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
},
_userActivate: function (active) {
if (this.active !== active) {
this.active = active;
this.fire('change');
}
},
_downHandler: function (event) {
this._setPointerDown(true);
this._setPressed(true);
this._setReceivedFocusFromKeyboard(false);
},
_upHandler: function () {
this._setPointerDown(false);
this._setPressed(false);
},
_spaceKeyDownHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
keyboardEvent.preventDefault();
keyboardEvent.stopImmediatePropagation();
this._setPressed(true);
},
_spaceKeyUpHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
if (this.pressed) {
this._asyncClick();
}
this._setPressed(false);
},
_asyncClick: function () {
this.async(function () {
this.click();
}, 1);
},
_pressedChanged: function (pressed) {
this._changedButtonState();
},
_ariaActiveAttributeChanged: function (value, oldValue) {
if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
this.removeAttribute(oldValue);
}
},
_activeChanged: function (active, ariaActiveAttribute) {
if (this.toggles) {
this.setAttribute(this.ariaActiveAttribute, active ? 'true' : 'false');
} else {
this.removeAttribute(this.ariaActiveAttribute);
}
this._changedButtonState();
},
_controlStateChanged: function () {
if (this.disabled) {
this._setPressed(false);
} else {
this._changedButtonState();
}
},
_changedButtonState: function () {
if (this._buttonStateChanged) {
this._buttonStateChanged();
}
}
};
Polymer.IronButtonState = [
Polymer.IronA11yKeysBehavior,
Polymer.IronButtonStateImpl
];
(function () {
var Utility = {
distance: function (x1, y1, x2, y2) {
var xDelta = x1 - x2;
var yDelta = y1 - y2;
return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
},
now: window.performance && window.performance.now ? window.performance.now.bind(window.performance) : Date.now
};
function ElementMetrics(element) {
this.element = element;
this.width = this.boundingRect.width;
this.height = this.boundingRect.height;
this.size = Math.max(this.width, this.height);
}
ElementMetrics.prototype = {
get boundingRect() {
return this.element.getBoundingClientRect();
},
furthestCornerDistanceFrom: function (x, y) {
var topLeft = Utility.distance(x, y, 0, 0);
var topRight = Utility.distance(x, y, this.width, 0);
var bottomLeft = Utility.distance(x, y, 0, this.height);
var bottomRight = Utility.distance(x, y, this.width, this.height);
return Math.max(topLeft, topRight, bottomLeft, bottomRight);
}
};
function Ripple(element) {
this.element = element;
this.color = window.getComputedStyle(element).color;
this.wave = document.createElement('div');
this.waveContainer = document.createElement('div');
this.wave.style.backgroundColor = this.color;
this.wave.classList.add('wave');
this.waveContainer.classList.add('wave-container');
Polymer.dom(this.waveContainer).appendChild(this.wave);
this.resetInteractionState();
}
Ripple.MAX_RADIUS = 300;
Ripple.prototype = {
get recenters() {
return this.element.recenters;
},
get center() {
return this.element.center;
},
get mouseDownElapsed() {
var elapsed;
if (!this.mouseDownStart) {
return 0;
}
elapsed = Utility.now() - this.mouseDownStart;
if (this.mouseUpStart) {
elapsed -= this.mouseUpElapsed;
}
return elapsed;
},
get mouseUpElapsed() {
return this.mouseUpStart ? Utility.now() - this.mouseUpStart : 0;
},
get mouseDownElapsedSeconds() {
return this.mouseDownElapsed / 1000;
},
get mouseUpElapsedSeconds() {
return this.mouseUpElapsed / 1000;
},
get mouseInteractionSeconds() {
return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
},
get initialOpacity() {
return this.element.initialOpacity;
},
get opacityDecayVelocity() {
return this.element.opacityDecayVelocity;
},
get radius() {
var width2 = this.containerMetrics.width * this.containerMetrics.width;
var height2 = this.containerMetrics.height * this.containerMetrics.height;
var waveRadius = Math.min(Math.sqrt(width2 + height2), Ripple.MAX_RADIUS) * 1.1 + 5;
var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
var timeNow = this.mouseInteractionSeconds / duration;
var size = waveRadius * (1 - Math.pow(80, -timeNow));
return Math.abs(size);
},
get opacity() {
if (!this.mouseUpStart) {
return this.initialOpacity;
}
return Math.max(0, this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity);
},
get outerOpacity() {
var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
var waveOpacity = this.opacity;
return Math.max(0, Math.min(outerOpacity, waveOpacity));
},
get isOpacityFullyDecayed() {
return this.opacity < 0.01 && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isRestingAtMaxRadius() {
return this.opacity >= this.initialOpacity && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isAnimationComplete() {
return this.mouseUpStart ? this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
},
get translationFraction() {
return Math.min(1, this.radius / this.containerMetrics.size * 2 / Math.sqrt(2));
},
get xNow() {
if (this.xEnd) {
return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
}
return this.xStart;
},
get yNow() {
if (this.yEnd) {
return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
}
return this.yStart;
},
get isMouseDown() {
return this.mouseDownStart && !this.mouseUpStart;
},
resetInteractionState: function () {
this.maxRadius = 0;
this.mouseDownStart = 0;
this.mouseUpStart = 0;
this.xStart = 0;
this.yStart = 0;
this.xEnd = 0;
this.yEnd = 0;
this.slideDistance = 0;
this.containerMetrics = new ElementMetrics(this.element);
},
draw: function () {
var scale;
var translateString;
var dx;
var dy;
this.wave.style.opacity = this.opacity;
scale = this.radius / (this.containerMetrics.size / 2);
dx = this.xNow - this.containerMetrics.width / 2;
dy = this.yNow - this.containerMetrics.height / 2;
this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
},
downAction: function (event) {
var xCenter = this.containerMetrics.width / 2;
var yCenter = this.containerMetrics.height / 2;
this.resetInteractionState();
this.mouseDownStart = Utility.now();
if (this.center) {
this.xStart = xCenter;
this.yStart = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
} else {
this.xStart = event ? event.detail.x - this.containerMetrics.boundingRect.left : this.containerMetrics.width / 2;
this.yStart = event ? event.detail.y - this.containerMetrics.boundingRect.top : this.containerMetrics.height / 2;
}
if (this.recenters) {
this.xEnd = xCenter;
this.yEnd = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
}
this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(this.xStart, this.yStart);
this.waveContainer.style.top = (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.left = (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.width = this.containerMetrics.size + 'px';
this.waveContainer.style.height = this.containerMetrics.size + 'px';
},
upAction: function (event) {
if (!this.isMouseDown) {
return;
}
this.mouseUpStart = Utility.now();
},
remove: function () {
Polymer.dom(this.waveContainer.parentNode).removeChild(this.waveContainer);
}
};
Polymer({
is: 'paper-ripple',
behaviors: [Polymer.IronA11yKeysBehavior],
properties: {
initialOpacity: {
type: Number,
value: 0.25
},
opacityDecayVelocity: {
type: Number,
value: 0.8
},
recenters: {
type: Boolean,
value: false
},
center: {
type: Boolean,
value: false
},
ripples: {
type: Array,
value: function () {
return [];
}
},
animating: {
type: Boolean,
readOnly: true,
reflectToAttribute: true,
value: false
},
holdDown: {
type: Boolean,
value: false,
observer: '_holdDownChanged'
},
noink: {
type: Boolean,
value: false
},
_animating: { type: Boolean },
_boundAnimate: {
type: Function,
value: function () {
return this.animate.bind(this);
}
}
},
get target() {
var ownerRoot = Polymer.dom(this).getOwnerRoot();
var target;
if (this.parentNode.nodeType == 11) {
target = ownerRoot.host;
} else {
target = this.parentNode;
}
return target;
},
keyBindings: {
'enter:keydown': '_onEnterKeydown',
'space:keydown': '_onSpaceKeydown',
'space:keyup': '_onSpaceKeyup'
},
attached: function () {
this.keyEventTarget = this.target;
this.listen(this.target, 'up', 'uiUpAction');
this.listen(this.target, 'down', 'uiDownAction');
},
detached: function () {
this.unlisten(this.target, 'up', 'uiUpAction');
this.unlisten(this.target, 'down', 'uiDownAction');
},
get shouldKeepAnimating() {
for (var index = 0; index < this.ripples.length; ++index) {
if (!this.ripples[index].isAnimationComplete) {
return true;
}
}
return false;
},
simulatedRipple: function () {
this.downAction(null);
this.async(function () {
this.upAction();
}, 1);
},
uiDownAction: function (event) {
if (!this.noink) {
this.downAction(event);
}
},
downAction: function (event) {
if (this.holdDown && this.ripples.length > 0) {
return;
}
var ripple = this.addRipple();
ripple.downAction(event);
if (!this._animating) {
this.animate();
}
},
uiUpAction: function (event) {
if (!this.noink) {
this.upAction(event);
}
},
upAction: function (event) {
if (this.holdDown) {
return;
}
this.ripples.forEach(function (ripple) {
ripple.upAction(event);
});
this.animate();
},
onAnimationComplete: function () {
this._animating = false;
this.$.background.style.backgroundColor = null;
this.fire('transitionend');
},
addRipple: function () {
var ripple = new Ripple(this);
Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
this.$.background.style.backgroundColor = ripple.color;
this.ripples.push(ripple);
this._setAnimating(true);
return ripple;
},
removeRipple: function (ripple) {
var rippleIndex = this.ripples.indexOf(ripple);
if (rippleIndex < 0) {
return;
}
this.ripples.splice(rippleIndex, 1);
ripple.remove();
if (!this.ripples.length) {
this._setAnimating(false);
}
},
animate: function () {
var index;
var ripple;
this._animating = true;
for (index = 0; index < this.ripples.length; ++index) {
ripple = this.ripples[index];
ripple.draw();
this.$.background.style.opacity = ripple.outerOpacity;
if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
this.removeRipple(ripple);
}
}
if (!this.shouldKeepAnimating && this.ripples.length === 0) {
this.onAnimationComplete();
} else {
window.requestAnimationFrame(this._boundAnimate);
}
},
_onEnterKeydown: function () {
this.uiDownAction();
this.async(this.uiUpAction, 1);
},
_onSpaceKeydown: function () {
this.uiDownAction();
},
_onSpaceKeyup: function () {
this.uiUpAction();
},
_holdDownChanged: function (newVal, oldVal) {
if (oldVal === undefined) {
return;
}
if (newVal) {
this.downAction();
} else {
this.upAction();
}
}
});
}());
Polymer.PaperRippleBehavior = {
properties: {
noink: {
type: Boolean,
observer: '_noinkChanged'
},
_rippleContainer: { type: Object }
},
_buttonStateChanged: function () {
if (this.focused) {
this.ensureRipple();
}
},
_downHandler: function (event) {
Polymer.IronButtonStateImpl._downHandler.call(this, event);
if (this.pressed) {
this.ensureRipple(event);
}
},
ensureRipple: function (optTriggeringEvent) {
if (!this.hasRipple()) {
this._ripple = this._createRipple();
this._ripple.noink = this.noink;
var rippleContainer = this._rippleContainer || this.root;
if (rippleContainer) {
Polymer.dom(rippleContainer).appendChild(this._ripple);
}
if (optTriggeringEvent) {
var domContainer = Polymer.dom(this._rippleContainer || this);
var target = Polymer.dom(optTriggeringEvent).rootTarget;
if (domContainer.deepContains(target)) {
this._ripple.uiDownAction(optTriggeringEvent);
}
}
}
},
getRipple: function () {
this.ensureRipple();
return this._ripple;
},
hasRipple: function () {
return Boolean(this._ripple);
},
_createRipple: function () {
return document.createElement('paper-ripple');
},
_noinkChanged: function (noink) {
if (this.hasRipple()) {
this._ripple.noink = noink;
}
}
};
Polymer.PaperButtonBehaviorImpl = {
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
readOnly: true
}
},
observers: [
'_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
'_computeKeyboardClass(receivedFocusFromKeyboard)'
],
hostAttributes: {
role: 'button',
tabindex: '0',
animated: true
},
_calculateElevation: function () {
var e = 1;
if (this.disabled) {
e = 0;
} else if (this.active || this.pressed) {
e = 4;
} else if (this.receivedFocusFromKeyboard) {
e = 3;
}
this._setElevation(e);
},
_computeKeyboardClass: function (receivedFocusFromKeyboard) {
this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
},
_spaceKeyDownHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
if (this.hasRipple() && this.getRipple().ripples.length < 1) {
this._ripple.uiDownAction();
}
},
_spaceKeyUpHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
if (this.hasRipple()) {
this._ripple.uiUpAction();
}
}
};
Polymer.PaperButtonBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperButtonBehaviorImpl
];
Polymer({
is: 'paper-fab',
behaviors: [Polymer.PaperButtonBehavior],
properties: {
src: {
type: String,
value: ''
},
icon: {
type: String,
value: ''
},
mini: {
type: Boolean,
value: false,
reflectToAttribute: true
},
label: {
type: String,
observer: '_labelChanged'
}
},
_labelChanged: function () {
this.setAttribute('aria-label', this.label);
},
_computeIsIconFab: function (icon, src) {
return icon.length > 0 || src.length > 0;
}
});
Polymer.IronSelection = function (selectCallback) {
this.selection = [];
this.selectCallback = selectCallback;
};
Polymer.IronSelection.prototype = {
get: function () {
return this.multi ? this.selection.slice() : this.selection[0];
},
clear: function (excludes) {
this.selection.slice().forEach(function (item) {
if (!excludes || excludes.indexOf(item) < 0) {
this.setItemSelected(item, false);
}
}, this);
},
isSelected: function (item) {
return this.selection.indexOf(item) >= 0;
},
setItemSelected: function (item, isSelected) {
if (item != null) {
if (isSelected !== this.isSelected(item)) {
if (isSelected) {
this.selection.push(item);
} else {
var i = this.selection.indexOf(item);
if (i >= 0) {
this.selection.splice(i, 1);
}
}
if (this.selectCallback) {
this.selectCallback(item, isSelected);
}
}
}
},
select: function (item) {
if (this.multi) {
this.toggle(item);
} else if (this.get() !== item) {
this.setItemSelected(this.get(), false);
this.setItemSelected(item, true);
}
},
toggle: function (item) {
this.setItemSelected(item, !this.isSelected(item));
}
};
Polymer.IronSelectableBehavior = {
properties: {
attrForSelected: {
type: String,
value: null
},
selected: {
type: String,
notify: true
},
selectedItem: {
type: Object,
readOnly: true,
notify: true
},
activateEvent: {
type: String,
value: 'tap',
observer: '_activateEventChanged'
},
selectable: String,
selectedClass: {
type: String,
value: 'iron-selected'
},
selectedAttribute: {
type: String,
value: null
},
fallbackSelection: {
type: String,
value: null
},
items: {
type: Array,
readOnly: true,
notify: true,
value: function () {
return [];
}
},
_excludedLocalNames: {
type: Object,
value: function () {
return { 'template': 1 };
}
}
},
observers: [
'_updateAttrForSelected(attrForSelected)',
'_updateSelected(selected)',
'_checkFallback(fallbackSelection)'
],
created: function () {
this._bindFilterItem = this._filterItem.bind(this);
this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
},
attached: function () {
this._observer = this._observeItems(this);
this._updateItems();
if (!this._shouldUpdateSelection) {
this._updateSelected();
}
this._addListener(this.activateEvent);
},
detached: function () {
if (this._observer) {
Polymer.dom(this).unobserveNodes(this._observer);
}
this._removeListener(this.activateEvent);
},
indexOf: function (item) {
return this.items.indexOf(item);
},
select: function (value) {
this.selected = value;
},
selectPrevious: function () {
var length = this.items.length;
var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
this.selected = this._indexToValue(index);
},
selectNext: function () {
var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
this.selected = this._indexToValue(index);
},
forceSynchronousItemUpdate: function () {
this._updateItems();
},
get _shouldUpdateSelection() {
return this.selected != null;
},
_checkFallback: function () {
if (this._shouldUpdateSelection) {
this._updateSelected();
}
},
_addListener: function (eventName) {
this.listen(this, eventName, '_activateHandler');
},
_removeListener: function (eventName) {
this.unlisten(this, eventName, '_activateHandler');
},
_activateEventChanged: function (eventName, old) {
this._removeListener(old);
this._addListener(eventName);
},
_updateItems: function () {
var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
nodes = Array.prototype.filter.call(nodes, this._bindFilterItem);
this._setItems(nodes);
},
_updateAttrForSelected: function () {
if (this._shouldUpdateSelection) {
this.selected = this._indexToValue(this.indexOf(this.selectedItem));
}
},
_updateSelected: function () {
this._selectSelected(this.selected);
},
_selectSelected: function (selected) {
this._selection.select(this._valueToItem(this.selected));
if (this.fallbackSelection && this.items.length && this._selection.get() === undefined) {
this.selected = this.fallbackSelection;
}
},
_filterItem: function (node) {
return !this._excludedLocalNames[node.localName];
},
_valueToItem: function (value) {
return value == null ? null : this.items[this._valueToIndex(value)];
},
_valueToIndex: function (value) {
if (this.attrForSelected) {
for (var i = 0, item; item = this.items[i]; i++) {
if (this._valueForItem(item) == value) {
return i;
}
}
} else {
return Number(value);
}
},
_indexToValue: function (index) {
if (this.attrForSelected) {
var item = this.items[index];
if (item) {
return this._valueForItem(item);
}
} else {
return index;
}
},
_valueForItem: function (item) {
var propValue = item[Polymer.CaseMap.dashToCamelCase(this.attrForSelected)];
return propValue != undefined ? propValue : item.getAttribute(this.attrForSelected);
},
_applySelection: function (item, isSelected) {
if (this.selectedClass) {
this.toggleClass(this.selectedClass, isSelected, item);
}
if (this.selectedAttribute) {
this.toggleAttribute(this.selectedAttribute, isSelected, item);
}
this._selectionChange();
this.fire('iron-' + (isSelected ? 'select' : 'deselect'), { item: item });
},
_selectionChange: function () {
this._setSelectedItem(this._selection.get());
},
_observeItems: function (node) {
return Polymer.dom(node).observeNodes(function (mutations) {
this._updateItems();
if (this._shouldUpdateSelection) {
this._updateSelected();
}
this.fire('iron-items-changed', mutations, {
bubbles: false,
cancelable: false
});
});
},
_activateHandler: function (e) {
var t = e.target;
var items = this.items;
while (t && t != this) {
var i = items.indexOf(t);
if (i >= 0) {
var value = this._indexToValue(i);
this._itemActivate(value, t);
return;
}
t = t.parentNode;
}
},
_itemActivate: function (value, item) {
if (!this.fire('iron-activate', {
selected: value,
item: item
}, { cancelable: true }).defaultPrevented) {
this.select(value);
}
}
};
Polymer.IronMultiSelectableBehaviorImpl = {
properties: {
multi: {
type: Boolean,
value: false,
observer: 'multiChanged'
},
selectedValues: {
type: Array,
notify: true
},
selectedItems: {
type: Array,
readOnly: true,
notify: true
}
},
observers: ['_updateSelected(selectedValues.splices)'],
select: function (value) {
if (this.multi) {
if (this.selectedValues) {
this._toggleSelected(value);
} else {
this.selectedValues = [value];
}
} else {
this.selected = value;
}
},
multiChanged: function (multi) {
this._selection.multi = multi;
},
get _shouldUpdateSelection() {
return this.selected != null || this.selectedValues != null && this.selectedValues.length;
},
_updateAttrForSelected: function () {
if (!this.multi) {
Polymer.IronSelectableBehavior._updateAttrForSelected.apply(this);
} else if (this._shouldUpdateSelection) {
this.selectedValues = this.selectedItems.map(function (selectedItem) {
return this._indexToValue(this.indexOf(selectedItem));
}, this).filter(function (unfilteredValue) {
return unfilteredValue != null;
}, this);
}
},
_updateSelected: function () {
if (this.multi) {
this._selectMulti(this.selectedValues);
} else {
this._selectSelected(this.selected);
}
},
_selectMulti: function (values) {
if (values) {
var selectedItems = this._valuesToItems(values);
this._selection.clear(selectedItems);
for (var i = 0; i < selectedItems.length; i++) {
this._selection.setItemSelected(selectedItems[i], true);
}
if (this.fallbackSelection && this.items.length && !this._selection.get().length) {
var fallback = this._valueToItem(this.fallbackSelection);
if (fallback) {
this.selectedValues = [this.fallbackSelection];
}
}
} else {
this._selection.clear();
}
},
_selectionChange: function () {
var s = this._selection.get();
if (this.multi) {
this._setSelectedItems(s);
} else {
this._setSelectedItems([s]);
this._setSelectedItem(s);
}
},
_toggleSelected: function (value) {
var i = this.selectedValues.indexOf(value);
var unselected = i < 0;
if (unselected) {
this.push('selectedValues', value);
} else {
this.splice('selectedValues', i, 1);
}
},
_valuesToItems: function (values) {
return values == null ? null : values.map(function (value) {
return this._valueToItem(value);
}, this);
}
};
Polymer.IronMultiSelectableBehavior = [
Polymer.IronSelectableBehavior,
Polymer.IronMultiSelectableBehaviorImpl
];
Polymer.IronMenuBehaviorImpl = {
properties: {
focusedItem: {
observer: '_focusedItemChanged',
readOnly: true,
type: Object
},
attrForItemTitle: { type: String }
},
hostAttributes: {
'role': 'menu',
'tabindex': '0'
},
observers: ['_updateMultiselectable(multi)'],
listeners: {
'focus': '_onFocus',
'keydown': '_onKeydown',
'iron-items-changed': '_onIronItemsChanged'
},
keyBindings: {
'up': '_onUpKey',
'down': '_onDownKey',
'esc': '_onEscKey',
'shift+tab:keydown': '_onShiftTabDown'
},
attached: function () {
this._resetTabindices();
},
select: function (value) {
if (this._defaultFocusAsync) {
this.cancelAsync(this._defaultFocusAsync);
this._defaultFocusAsync = null;
}
var item = this._valueToItem(value);
if (item && item.hasAttribute('disabled'))
return;
this._setFocusedItem(item);
Polymer.IronMultiSelectableBehaviorImpl.select.apply(this, arguments);
},
_resetTabindices: function () {
var selectedItem = this.multi ? this.selectedItems && this.selectedItems[0] : this.selectedItem;
this.items.forEach(function (item) {
item.setAttribute('tabindex', item === selectedItem ? '0' : '-1');
}, this);
},
_updateMultiselectable: function (multi) {
if (multi) {
this.setAttribute('aria-multiselectable', 'true');
} else {
this.removeAttribute('aria-multiselectable');
}
},
_focusWithKeyboardEvent: function (event) {
for (var i = 0, item; item = this.items[i]; i++) {
var attr = this.attrForItemTitle || 'textContent';
var title = item[attr] || item.getAttribute(attr);
if (title && title.trim().charAt(0).toLowerCase() === String.fromCharCode(event.keyCode).toLowerCase()) {
this._setFocusedItem(item);
break;
}
}
},
_focusPrevious: function () {
var length = this.items.length;
var index = (Number(this.indexOf(this.focusedItem)) - 1 + length) % length;
this._setFocusedItem(this.items[index]);
},
_focusNext: function () {
var index = (Number(this.indexOf(this.focusedItem)) + 1) % this.items.length;
this._setFocusedItem(this.items[index]);
},
_applySelection: function (item, isSelected) {
if (isSelected) {
item.setAttribute('aria-selected', 'true');
} else {
item.removeAttribute('aria-selected');
}
Polymer.IronSelectableBehavior._applySelection.apply(this, arguments);
},
_focusedItemChanged: function (focusedItem, old) {
old && old.setAttribute('tabindex', '-1');
if (focusedItem) {
focusedItem.setAttribute('tabindex', '0');
focusedItem.focus();
}
},
_onIronItemsChanged: function (event) {
var mutations = event.detail;
var mutation;
var index;
for (index = 0; index < mutations.length; ++index) {
mutation = mutations[index];
if (mutation.addedNodes.length) {
this._resetTabindices();
break;
}
}
},
_onShiftTabDown: function (event) {
var oldTabIndex = this.getAttribute('tabindex');
Polymer.IronMenuBehaviorImpl._shiftTabPressed = true;
this._setFocusedItem(null);
this.setAttribute('tabindex', '-1');
this.async(function () {
this.setAttribute('tabindex', oldTabIndex);
Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
}, 1);
},
_onFocus: function (event) {
if (Polymer.IronMenuBehaviorImpl._shiftTabPressed) {
return;
}
var rootTarget = Polymer.dom(event).rootTarget;
if (rootTarget !== this && typeof rootTarget.tabIndex !== 'undefined' && !this.isLightDescendant(rootTarget)) {
return;
}
this._defaultFocusAsync = this.async(function () {
var selectedItem = this.multi ? this.selectedItems && this.selectedItems[0] : this.selectedItem;
this._setFocusedItem(null);
if (selectedItem) {
this._setFocusedItem(selectedItem);
} else if (this.items[0]) {
this._setFocusedItem(this.items[0]);
}
});
},
_onUpKey: function (event) {
this._focusPrevious();
event.detail.keyboardEvent.preventDefault();
},
_onDownKey: function (event) {
this._focusNext();
event.detail.keyboardEvent.preventDefault();
},
_onEscKey: function (event) {
this.focusedItem.blur();
},
_onKeydown: function (event) {
if (!this.keyboardEventMatchesKeys(event, 'up down esc')) {
this._focusWithKeyboardEvent(event);
}
event.stopPropagation();
},
_activateHandler: function (event) {
Polymer.IronSelectableBehavior._activateHandler.call(this, event);
event.stopPropagation();
}
};
Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
Polymer.IronMenuBehavior = [
Polymer.IronMultiSelectableBehavior,
Polymer.IronA11yKeysBehavior,
Polymer.IronMenuBehaviorImpl
];
Polymer.IronMenubarBehaviorImpl = {
hostAttributes: { 'role': 'menubar' },
keyBindings: {
'left': '_onLeftKey',
'right': '_onRightKey'
},
_onUpKey: function (event) {
this.focusedItem.click();
event.detail.keyboardEvent.preventDefault();
},
_onDownKey: function (event) {
this.focusedItem.click();
event.detail.keyboardEvent.preventDefault();
},
get _isRTL() {
return window.getComputedStyle(this)['direction'] === 'rtl';
},
_onLeftKey: function (event) {
if (this._isRTL) {
this._focusNext();
} else {
this._focusPrevious();
}
event.detail.keyboardEvent.preventDefault();
},
_onRightKey: function (event) {
if (this._isRTL) {
this._focusPrevious();
} else {
this._focusNext();
}
event.detail.keyboardEvent.preventDefault();
},
_onKeydown: function (event) {
if (this.keyboardEventMatchesKeys(event, 'up down left right esc')) {
return;
}
this._focusWithKeyboardEvent(event);
}
};
Polymer.IronMenubarBehavior = [
Polymer.IronMenuBehavior,
Polymer.IronMenubarBehaviorImpl
];
Polymer.IronResizableBehavior = {
properties: {
_parentResizable: {
type: Object,
observer: '_parentResizableChanged'
},
_notifyingDescendant: {
type: Boolean,
value: false
}
},
listeners: { 'iron-request-resize-notifications': '_onIronRequestResizeNotifications' },
created: function () {
this._interestedResizables = [];
this._boundNotifyResize = this.notifyResize.bind(this);
},
attached: function () {
this.fire('iron-request-resize-notifications', null, {
node: this,
bubbles: true,
cancelable: true
});
if (!this._parentResizable) {
window.addEventListener('resize', this._boundNotifyResize);
this.notifyResize();
}
},
detached: function () {
if (this._parentResizable) {
this._parentResizable.stopResizeNotificationsFor(this);
} else {
window.removeEventListener('resize', this._boundNotifyResize);
}
this._parentResizable = null;
},
notifyResize: function () {
if (!this.isAttached) {
return;
}
this._interestedResizables.forEach(function (resizable) {
if (this.resizerShouldNotify(resizable)) {
this._notifyDescendant(resizable);
}
}, this);
this._fireResize();
},
assignParentResizable: function (parentResizable) {
this._parentResizable = parentResizable;
},
stopResizeNotificationsFor: function (target) {
var index = this._interestedResizables.indexOf(target);
if (index > -1) {
this._interestedResizables.splice(index, 1);
this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
}
},
resizerShouldNotify: function (element) {
return true;
},
_onDescendantIronResize: function (event) {
if (this._notifyingDescendant) {
event.stopPropagation();
return;
}
if (!Polymer.Settings.useShadow) {
this._fireResize();
}
},
_fireResize: function () {
this.fire('iron-resize', null, {
node: this,
bubbles: false
});
},
_onIronRequestResizeNotifications: function (event) {
var target = event.path ? event.path[0] : event.target;
if (target === this) {
return;
}
if (this._interestedResizables.indexOf(target) === -1) {
this._interestedResizables.push(target);
this.listen(target, 'iron-resize', '_onDescendantIronResize');
}
target.assignParentResizable(this);
this._notifyDescendant(target);
event.stopPropagation();
},
_parentResizableChanged: function (parentResizable) {
if (parentResizable) {
window.removeEventListener('resize', this._boundNotifyResize);
}
},
_notifyDescendant: function (descendant) {
if (!this.isAttached) {
return;
}
this._notifyingDescendant = true;
descendant.notifyResize();
this._notifyingDescendant = false;
}
};
Polymer.PaperInkyFocusBehaviorImpl = {
observers: ['_focusedChanged(receivedFocusFromKeyboard)'],
_focusedChanged: function (receivedFocusFromKeyboard) {
if (receivedFocusFromKeyboard) {
this.ensureRipple();
}
if (this.hasRipple()) {
this._ripple.holdDown = receivedFocusFromKeyboard;
}
},
_createRipple: function () {
var ripple = Polymer.PaperRippleBehavior._createRipple();
ripple.id = 'ink';
ripple.setAttribute('center', '');
ripple.classList.add('circle');
return ripple;
}
};
Polymer.PaperInkyFocusBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperInkyFocusBehaviorImpl
];
Polymer({
is: 'paper-icon-button',
hostAttributes: {
role: 'button',
tabindex: '0'
},
behaviors: [Polymer.PaperInkyFocusBehavior],
properties: {
src: { type: String },
icon: { type: String },
alt: {
type: String,
observer: '_altChanged'
}
},
_altChanged: function (newValue, oldValue) {
var label = this.getAttribute('aria-label');
if (!label || oldValue == label) {
this.setAttribute('aria-label', newValue);
}
}
});
Polymer({
is: 'paper-tab',
behaviors: [
Polymer.IronControlState,
Polymer.IronButtonState,
Polymer.PaperRippleBehavior
],
properties: {
link: {
type: Boolean,
value: false,
reflectToAttribute: true
}
},
hostAttributes: { role: 'tab' },
listeners: {
down: '_updateNoink',
tap: '_onTap'
},
attached: function () {
this._updateNoink();
},
get _parentNoink() {
var parent = Polymer.dom(this).parentNode;
return !!parent && !!parent.noink;
},
_updateNoink: function () {
this.noink = !!this.noink || !!this._parentNoink;
},
_onTap: function (event) {
if (this.link) {
var anchor = this.queryEffectiveChildren('a');
if (!anchor) {
return;
}
if (event.target === anchor) {
return;
}
anchor.click();
}
}
});
Polymer({
is: 'paper-tabs',
behaviors: [
Polymer.IronResizableBehavior,
Polymer.IronMenubarBehavior
],
properties: {
noink: {
type: Boolean,
value: false,
observer: '_noinkChanged'
},
noBar: {
type: Boolean,
value: false
},
noSlide: {
type: Boolean,
value: false
},
scrollable: {
type: Boolean,
value: false
},
disableDrag: {
type: Boolean,
value: false
},
hideScrollButtons: {
type: Boolean,
value: false
},
alignBottom: {
type: Boolean,
value: false
},
selectable: {
type: String,
value: 'paper-tab'
},
autoselect: {
type: Boolean,
value: false
},
autoselectDelay: {
type: Number,
value: 0
},
_step: {
type: Number,
value: 10
},
_holdDelay: {
type: Number,
value: 1
},
_leftHidden: {
type: Boolean,
value: false
},
_rightHidden: {
type: Boolean,
value: false
},
_previousTab: { type: Object }
},
hostAttributes: { role: 'tablist' },
listeners: {
'iron-resize': '_onTabSizingChanged',
'iron-items-changed': '_onTabSizingChanged',
'iron-select': '_onIronSelect',
'iron-deselect': '_onIronDeselect'
},
keyBindings: { 'left:keyup right:keyup': '_onArrowKeyup' },
created: function () {
this._holdJob = null;
this._pendingActivationItem = undefined;
this._pendingActivationTimeout = undefined;
this._bindDelayedActivationHandler = this._delayedActivationHandler.bind(this);
this.addEventListener('blur', this._onBlurCapture.bind(this), true);
},
ready: function () {
this.setScrollDirection('y', this.$.tabsContainer);
},
detached: function () {
this._cancelPendingActivation();
},
_noinkChanged: function (noink) {
var childTabs = Polymer.dom(this).querySelectorAll('paper-tab');
childTabs.forEach(noink ? this._setNoinkAttribute : this._removeNoinkAttribute);
},
_setNoinkAttribute: function (element) {
element.setAttribute('noink', '');
},
_removeNoinkAttribute: function (element) {
element.removeAttribute('noink');
},
_computeScrollButtonClass: function (hideThisButton, scrollable, hideScrollButtons) {
if (!scrollable || hideScrollButtons) {
return 'hidden';
}
if (hideThisButton) {
return 'not-visible';
}
return '';
},
_computeTabsContentClass: function (scrollable) {
return scrollable ? 'scrollable' : 'horizontal';
},
_computeSelectionBarClass: function (noBar, alignBottom) {
if (noBar) {
return 'hidden';
} else if (alignBottom) {
return 'align-bottom';
}
return '';
},
_onTabSizingChanged: function () {
this.debounce('_onTabSizingChanged', function () {
this._scroll();
this._tabChanged(this.selectedItem);
}, 10);
},
_onIronSelect: function (event) {
this._tabChanged(event.detail.item, this._previousTab);
this._previousTab = event.detail.item;
this.cancelDebouncer('tab-changed');
},
_onIronDeselect: function (event) {
this.debounce('tab-changed', function () {
this._tabChanged(null, this._previousTab);
}, 1);
},
_activateHandler: function () {
this._cancelPendingActivation();
Polymer.IronMenuBehaviorImpl._activateHandler.apply(this, arguments);
},
_scheduleActivation: function (item, delay) {
this._pendingActivationItem = item;
this._pendingActivationTimeout = this.async(this._bindDelayedActivationHandler, delay);
},
_delayedActivationHandler: function () {
var item = this._pendingActivationItem;
this._pendingActivationItem = undefined;
this._pendingActivationTimeout = undefined;
item.fire(this.activateEvent, null, {
bubbles: true,
cancelable: true
});
},
_cancelPendingActivation: function () {
if (this._pendingActivationTimeout !== undefined) {
this.cancelAsync(this._pendingActivationTimeout);
this._pendingActivationItem = undefined;
this._pendingActivationTimeout = undefined;
}
},
_onArrowKeyup: function (event) {
if (this.autoselect) {
this._scheduleActivation(this.focusedItem, this.autoselectDelay);
}
},
_onBlurCapture: function (event) {
if (event.target === this._pendingActivationItem) {
this._cancelPendingActivation();
}
},
get _tabContainerScrollSize() {
return Math.max(0, this.$.tabsContainer.scrollWidth - this.$.tabsContainer.offsetWidth);
},
_scroll: function (e, detail) {
if (!this.scrollable) {
return;
}
var ddx = detail && -detail.ddx || 0;
this._affectScroll(ddx);
},
_down: function (e) {
this.async(function () {
if (this._defaultFocusAsync) {
this.cancelAsync(this._defaultFocusAsync);
this._defaultFocusAsync = null;
}
}, 1);
},
_affectScroll: function (dx) {
this.$.tabsContainer.scrollLeft += dx;
var scrollLeft = this.$.tabsContainer.scrollLeft;
this._leftHidden = scrollLeft === 0;
this._rightHidden = scrollLeft === this._tabContainerScrollSize;
},
_onLeftScrollButtonDown: function () {
this._scrollToLeft();
this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
},
_onRightScrollButtonDown: function () {
this._scrollToRight();
this._holdJob = setInterval(this._scrollToRight.bind(this), this._holdDelay);
},
_onScrollButtonUp: function () {
clearInterval(this._holdJob);
this._holdJob = null;
},
_scrollToLeft: function () {
this._affectScroll(-this._step);
},
_scrollToRight: function () {
this._affectScroll(this._step);
},
_tabChanged: function (tab, old) {
if (!tab) {
this._positionBar(0, 0);
return;
}
var r = this.$.tabsContent.getBoundingClientRect();
var w = r.width;
var tabRect = tab.getBoundingClientRect();
var tabOffsetLeft = tabRect.left - r.left;
this._pos = {
width: this._calcPercent(tabRect.width, w),
left: this._calcPercent(tabOffsetLeft, w)
};
if (this.noSlide || old == null) {
this._positionBar(this._pos.width, this._pos.left);
return;
}
var oldRect = old.getBoundingClientRect();
var oldIndex = this.items.indexOf(old);
var index = this.items.indexOf(tab);
var m = 5;
this.$.selectionBar.classList.add('expand');
var moveRight = oldIndex < index;
var isRTL = this._isRTL;
if (isRTL) {
moveRight = !moveRight;
}
if (moveRight) {
this._positionBar(this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m, this._left);
} else {
this._positionBar(this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m, this._calcPercent(tabOffsetLeft, w) + m);
}
if (this.scrollable) {
this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
}
},
_scrollToSelectedIfNeeded: function (tabWidth, tabOffsetLeft) {
var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
if (l < 0) {
this.$.tabsContainer.scrollLeft += l;
} else {
l += tabWidth - this.$.tabsContainer.offsetWidth;
if (l > 0) {
this.$.tabsContainer.scrollLeft += l;
}
}
},
_calcPercent: function (w, w0) {
return 100 * w / w0;
},
_positionBar: function (width, left) {
width = width || 0;
left = left || 0;
this._width = width;
this._left = left;
this.transform('translate3d(' + left + '%, 0, 0) scaleX(' + width / 100 + ')', this.$.selectionBar);
},
_onBarTransitionEnd: function (e) {
var cl = this.$.selectionBar.classList;
if (cl.contains('expand')) {
cl.remove('expand');
cl.add('contract');
this._positionBar(this._pos.width, this._pos.left);
} else if (cl.contains('contract')) {
cl.remove('contract');
}
}
});
console.warn('This file is deprecated. Please use `iron-flex-layout/iron-flex-layout-classes.html`, and one of the specific dom-modules instead');
console.warn('This file is deprecated. Please use `iron-flex-layout/iron-flex-layout-classes.html`, and one of the specific dom-modules instead');
Polymer({
is: 'paper-toolbar',
hostAttributes: { 'role': 'toolbar' },
properties: {
bottomJustify: {
type: String,
value: ''
},
justify: {
type: String,
value: ''
},
middleJustify: {
type: String,
value: ''
}
},
attached: function () {
this._observer = this._observe(this);
this._updateAriaLabelledBy();
},
detached: function () {
if (this._observer) {
this._observer.disconnect();
}
},
_observe: function (node) {
var observer = new MutationObserver(function () {
this._updateAriaLabelledBy();
}.bind(this));
observer.observe(node, {
childList: true,
subtree: true
});
return observer;
},
_updateAriaLabelledBy: function () {
var labelledBy = [];
var contents = Polymer.dom(this.root).querySelectorAll('content');
for (var content, index = 0; content = contents[index]; index++) {
var nodes = Polymer.dom(content).getDistributedNodes();
for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
if (node.classList && node.classList.contains('title')) {
if (node.id) {
labelledBy.push(node.id);
} else {
var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
node.id = id;
labelledBy.push(id);
}
}
}
}
if (labelledBy.length > 0) {
this.setAttribute('aria-labelledby', labelledBy.join(' '));
}
},
_computeBarExtraClasses: function (barJustify) {
if (!barJustify)
return '';
return barJustify + (barJustify === 'justified' ? '' : '-justified');
}
});
Polymer({
is: 'paper-material',
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
value: 1
},
animated: {
type: Boolean,
reflectToAttribute: true,
value: false
}
}
});
Polymer({
is: 'paper-button',
behaviors: [Polymer.PaperButtonBehavior],
properties: {
raised: {
type: Boolean,
reflectToAttribute: true,
value: false,
observer: '_calculateElevation'
}
},
_calculateElevation: function () {
if (!this.raised) {
this._setElevation(0);
} else {
Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
}
}
});
Polymer.IronFormElementBehavior = {
properties: {
name: { type: String },
value: {
notify: true,
type: String
},
required: {
type: Boolean,
value: false
},
_parentForm: { type: Object }
},
attached: function () {
this.fire('iron-form-element-register');
},
detached: function () {
if (this._parentForm) {
this._parentForm.fire('iron-form-element-unregister', { target: this });
}
}
};
Polymer.IronValidatableBehavior = {
properties: {
validatorType: {
type: String,
value: 'validator'
},
validator: { type: String },
invalid: {
notify: true,
reflectToAttribute: true,
type: Boolean,
value: false
},
_validatorMeta: { type: Object }
},
observers: ['_invalidChanged(invalid)'],
get _validator() {
return this._validatorMeta && this._validatorMeta.byKey(this.validator);
},
ready: function () {
this._validatorMeta = new Polymer.IronMeta({ type: this.validatorType });
},
_invalidChanged: function () {
if (this.invalid) {
this.setAttribute('aria-invalid', 'true');
} else {
this.removeAttribute('aria-invalid');
}
},
hasValidator: function () {
return this._validator != null;
},
validate: function (value) {
this.invalid = !this._getValidity(value);
return !this.invalid;
},
_getValidity: function (value) {
if (this.hasValidator()) {
return this._validator.validate(value);
}
return true;
}
};
(function () {
'use strict';
Polymer.IronA11yAnnouncer = Polymer({
is: 'iron-a11y-announcer',
properties: {
mode: {
type: String,
value: 'polite'
},
_text: {
type: String,
value: ''
}
},
created: function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = this;
}
document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
},
announce: function (text) {
this._text = '';
this.async(function () {
this._text = text;
}, 100);
},
_onIronAnnounce: function (event) {
if (event.detail && event.detail.text) {
this.announce(event.detail.text);
}
}
});
Polymer.IronA11yAnnouncer.instance = null;
Polymer.IronA11yAnnouncer.requestAvailability = function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
}
document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
};
}());
Polymer({
is: 'iron-input',
extends: 'input',
behaviors: [Polymer.IronValidatableBehavior],
properties: {
bindValue: {
observer: '_bindValueChanged',
type: String
},
preventInvalidInput: { type: Boolean },
allowedPattern: {
type: String,
observer: '_allowedPatternChanged'
},
_previousValidInput: {
type: String,
value: ''
},
_patternAlreadyChecked: {
type: Boolean,
value: false
}
},
listeners: {
'input': '_onInput',
'keypress': '_onKeypress'
},
registered: function () {
if (!this._canDispatchEventOnDisabled()) {
this._origDispatchEvent = this.dispatchEvent;
this.dispatchEvent = this._dispatchEventFirefoxIE;
}
},
created: function () {
Polymer.IronA11yAnnouncer.requestAvailability();
},
_canDispatchEventOnDisabled: function () {
var input = document.createElement('input');
var canDispatch = false;
input.disabled = true;
input.addEventListener('feature-check-dispatch-event', function () {
canDispatch = true;
});
try {
input.dispatchEvent(new Event('feature-check-dispatch-event'));
} catch (e) {
}
return canDispatch;
},
_dispatchEventFirefoxIE: function () {
var disabled = this.disabled;
this.disabled = false;
this._origDispatchEvent.apply(this, arguments);
this.disabled = disabled;
},
get _patternRegExp() {
var pattern;
if (this.allowedPattern) {
pattern = new RegExp(this.allowedPattern);
} else {
switch (this.type) {
case 'number':
pattern = /[0-9.,e-]/;
break;
}
}
return pattern;
},
ready: function () {
this.bindValue = this.value;
},
_bindValueChanged: function () {
if (this.value !== this.bindValue) {
this.value = !(this.bindValue || this.bindValue === 0 || this.bindValue === false) ? '' : this.bindValue;
}
this.fire('bind-value-changed', { value: this.bindValue });
},
_allowedPatternChanged: function () {
this.preventInvalidInput = this.allowedPattern ? true : false;
},
_onInput: function () {
if (this.preventInvalidInput && !this._patternAlreadyChecked) {
var valid = this._checkPatternValidity();
if (!valid) {
this._announceInvalidCharacter('Invalid string of characters not entered.');
this.value = this._previousValidInput;
}
}
this.bindValue = this.value;
this._previousValidInput = this.value;
this._patternAlreadyChecked = false;
},
_isPrintable: function (event) {
var anyNonPrintable = event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 13 || event.keyCode == 27;
var mozNonPrintable = event.keyCode == 19 || event.keyCode == 20 || event.keyCode == 45 || event.keyCode == 46 || event.keyCode == 144 || event.keyCode == 145 || event.keyCode > 32 && event.keyCode < 41 || event.keyCode > 111 && event.keyCode < 124;
return !anyNonPrintable && !(event.charCode == 0 && mozNonPrintable);
},
_onKeypress: function (event) {
if (!this.preventInvalidInput && this.type !== 'number') {
return;
}
var regexp = this._patternRegExp;
if (!regexp) {
return;
}
if (event.metaKey || event.ctrlKey || event.altKey)
return;
this._patternAlreadyChecked = true;
var thisChar = String.fromCharCode(event.charCode);
if (this._isPrintable(event) && !regexp.test(thisChar)) {
event.preventDefault();
this._announceInvalidCharacter('Invalid character ' + thisChar + ' not entered.');
}
},
_checkPatternValidity: function () {
var regexp = this._patternRegExp;
if (!regexp) {
return true;
}
for (var i = 0; i < this.value.length; i++) {
if (!regexp.test(this.value[i])) {
return false;
}
}
return true;
},
validate: function () {
var valid = this.checkValidity();
if (valid) {
if (this.required && this.value === '') {
valid = false;
} else if (this.hasValidator()) {
valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
}
}
this.invalid = !valid;
this.fire('iron-input-validate');
return valid;
},
_announceInvalidCharacter: function (message) {
this.fire('iron-announce', { text: message });
}
});
Polymer.PaperInputBehaviorImpl = {
properties: {
label: { type: String },
value: {
notify: true,
type: String
},
disabled: {
type: Boolean,
value: false
},
invalid: {
type: Boolean,
value: false,
notify: true
},
preventInvalidInput: { type: Boolean },
allowedPattern: { type: String },
type: { type: String },
list: { type: String },
pattern: { type: String },
required: {
type: Boolean,
value: false
},
errorMessage: { type: String },
charCounter: {
type: Boolean,
value: false
},
noLabelFloat: {
type: Boolean,
value: false
},
alwaysFloatLabel: {
type: Boolean,
value: false
},
autoValidate: {
type: Boolean,
value: false
},
validator: { type: String },
autocomplete: {
type: String,
value: 'off'
},
autofocus: { type: Boolean },
inputmode: { type: String },
minlength: { type: Number },
maxlength: { type: Number },
min: { type: String },
max: { type: String },
step: { type: String },
name: { type: String },
placeholder: {
type: String,
value: ''
},
readonly: {
type: Boolean,
value: false
},
size: { type: Number },
autocapitalize: {
type: String,
value: 'none'
},
autocorrect: {
type: String,
value: 'off'
},
autosave: { type: String },
results: { type: Number },
accept: { type: String },
multiple: { type: Boolean },
_ariaDescribedBy: {
type: String,
value: ''
},
_ariaLabelledBy: {
type: String,
value: ''
}
},
listeners: { 'addon-attached': '_onAddonAttached' },
keyBindings: { 'shift+tab:keydown': '_onShiftTabDown' },
hostAttributes: { tabindex: 0 },
get inputElement() {
return this.$.input;
},
get _focusableElement() {
return this.inputElement;
},
registered: function () {
this._typesThatHaveText = [
'date',
'datetime',
'datetime-local',
'month',
'time',
'week',
'file'
];
},
attached: function () {
this._updateAriaLabelledBy();
if (this.inputElement && this._typesThatHaveText.indexOf(this.inputElement.type) !== -1) {
this.alwaysFloatLabel = true;
}
},
_appendStringWithSpace: function (str, more) {
if (str) {
str = str + ' ' + more;
} else {
str = more;
}
return str;
},
_onAddonAttached: function (event) {
var target = event.path ? event.path[0] : event.target;
if (target.id) {
this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, target.id);
} else {
var id = 'paper-input-add-on-' + Math.floor(Math.random() * 100000);
target.id = id;
this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, id);
}
},
validate: function () {
return this.inputElement.validate();
},
_focusBlurHandler: function (event) {
if (this._shiftTabPressed)
return;
Polymer.IronControlState._focusBlurHandler.call(this, event);
if (this.focused)
this._focusableElement.focus();
},
_onShiftTabDown: function (event) {
var oldTabIndex = this.getAttribute('tabindex');
this._shiftTabPressed = true;
this.setAttribute('tabindex', '-1');
this.async(function () {
this.setAttribute('tabindex', oldTabIndex);
this._shiftTabPressed = false;
}, 1);
},
_handleAutoValidate: function () {
if (this.autoValidate)
this.validate();
},
updateValueAndPreserveCaret: function (newValue) {
try {
var start = this.inputElement.selectionStart;
this.value = newValue;
this.inputElement.selectionStart = start;
this.inputElement.selectionEnd = start;
} catch (e) {
this.value = newValue;
}
},
_computeAlwaysFloatLabel: function (alwaysFloatLabel, placeholder) {
return placeholder || alwaysFloatLabel;
},
_updateAriaLabelledBy: function () {
var label = Polymer.dom(this.root).querySelector('label');
if (!label) {
this._ariaLabelledBy = '';
return;
}
var labelledBy;
if (label.id) {
labelledBy = label.id;
} else {
labelledBy = 'paper-input-label-' + new Date().getUTCMilliseconds();
label.id = labelledBy;
}
this._ariaLabelledBy = labelledBy;
},
_onChange: function (event) {
if (this.shadowRoot) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
}
};
Polymer.PaperInputBehavior = [
Polymer.IronControlState,
Polymer.IronA11yKeysBehavior,
Polymer.PaperInputBehaviorImpl
];
Polymer.PaperInputAddonBehavior = {
hostAttributes: { 'add-on': '' },
attached: function () {
this.fire('addon-attached');
},
update: function (state) {
}
};
Polymer({
is: 'paper-input-char-counter',
behaviors: [Polymer.PaperInputAddonBehavior],
properties: {
_charCounterStr: {
type: String,
value: '0'
}
},
update: function (state) {
if (!state.inputElement) {
return;
}
state.value = state.value || '';
var counter = state.value.length.toString();
if (state.inputElement.hasAttribute('maxlength')) {
counter += '/' + state.inputElement.getAttribute('maxlength');
}
this._charCounterStr = counter;
}
});
Polymer({
is: 'paper-input-container',
properties: {
noLabelFloat: {
type: Boolean,
value: false
},
alwaysFloatLabel: {
type: Boolean,
value: false
},
attrForValue: {
type: String,
value: 'bind-value'
},
autoValidate: {
type: Boolean,
value: false
},
invalid: {
observer: '_invalidChanged',
type: Boolean,
value: false
},
focused: {
readOnly: true,
type: Boolean,
value: false,
notify: true
},
_addons: { type: Array },
_inputHasContent: {
type: Boolean,
value: false
},
_inputSelector: {
type: String,
value: 'input,textarea,.paper-input-input'
},
_boundOnFocus: {
type: Function,
value: function () {
return this._onFocus.bind(this);
}
},
_boundOnBlur: {
type: Function,
value: function () {
return this._onBlur.bind(this);
}
},
_boundOnInput: {
type: Function,
value: function () {
return this._onInput.bind(this);
}
},
_boundValueChanged: {
type: Function,
value: function () {
return this._onValueChanged.bind(this);
}
}
},
listeners: {
'addon-attached': '_onAddonAttached',
'iron-input-validate': '_onIronInputValidate'
},
get _valueChangedEvent() {
return this.attrForValue + '-changed';
},
get _propertyForValue() {
return Polymer.CaseMap.dashToCamelCase(this.attrForValue);
},
get _inputElement() {
return Polymer.dom(this).querySelector(this._inputSelector);
},
get _inputElementValue() {
return this._inputElement[this._propertyForValue] || this._inputElement.value;
},
ready: function () {
if (!this._addons) {
this._addons = [];
}
this.addEventListener('focus', this._boundOnFocus, true);
this.addEventListener('blur', this._boundOnBlur, true);
},
attached: function () {
if (this.attrForValue) {
this._inputElement.addEventListener(this._valueChangedEvent, this._boundValueChanged);
} else {
this.addEventListener('input', this._onInput);
}
if (this._inputElementValue != '') {
this._handleValueAndAutoValidate(this._inputElement);
} else {
this._handleValue(this._inputElement);
}
},
_onAddonAttached: function (event) {
if (!this._addons) {
this._addons = [];
}
var target = event.target;
if (this._addons.indexOf(target) === -1) {
this._addons.push(target);
if (this.isAttached) {
this._handleValue(this._inputElement);
}
}
},
_onFocus: function () {
this._setFocused(true);
},
_onBlur: function () {
this._setFocused(false);
this._handleValueAndAutoValidate(this._inputElement);
},
_onInput: function (event) {
this._handleValueAndAutoValidate(event.target);
},
_onValueChanged: function (event) {
this._handleValueAndAutoValidate(event.target);
},
_handleValue: function (inputElement) {
var value = this._inputElementValue;
if (value || value === 0 || inputElement.type === 'number' && !inputElement.checkValidity()) {
this._inputHasContent = true;
} else {
this._inputHasContent = false;
}
this.updateAddons({
inputElement: inputElement,
value: value,
invalid: this.invalid
});
},
_handleValueAndAutoValidate: function (inputElement) {
if (this.autoValidate) {
var valid;
if (inputElement.validate) {
valid = inputElement.validate(this._inputElementValue);
} else {
valid = inputElement.checkValidity();
}
this.invalid = !valid;
}
this._handleValue(inputElement);
},
_onIronInputValidate: function (event) {
this.invalid = this._inputElement.invalid;
},
_invalidChanged: function () {
if (this._addons) {
this.updateAddons({ invalid: this.invalid });
}
},
updateAddons: function (state) {
for (var addon, index = 0; addon = this._addons[index]; index++) {
addon.update(state);
}
},
_computeInputContentClass: function (noLabelFloat, alwaysFloatLabel, focused, invalid, _inputHasContent) {
var cls = 'input-content';
if (!noLabelFloat) {
var label = this.querySelector('label');
if (alwaysFloatLabel || _inputHasContent) {
cls += ' label-is-floating';
this.$.labelAndInputContainer.style.position = 'static';
if (invalid) {
cls += ' is-invalid';
} else if (focused) {
cls += ' label-is-highlighted';
}
} else {
if (label) {
this.$.labelAndInputContainer.style.position = 'relative';
}
}
} else {
if (_inputHasContent) {
cls += ' label-is-hidden';
}
}
return cls;
},
_computeUnderlineClass: function (focused, invalid) {
var cls = 'underline';
if (invalid) {
cls += ' is-invalid';
} else if (focused) {
cls += ' is-highlighted';
}
return cls;
},
_computeAddOnContentClass: function (focused, invalid) {
var cls = 'add-on-content';
if (invalid) {
cls += ' is-invalid';
} else if (focused) {
cls += ' is-highlighted';
}
return cls;
}
});
Polymer({
is: 'paper-input-error',
behaviors: [Polymer.PaperInputAddonBehavior],
properties: {
invalid: {
readOnly: true,
reflectToAttribute: true,
type: Boolean
}
},
update: function (state) {
this._setInvalid(state.invalid);
}
});
Polymer({
is: 'paper-input',
behaviors: [
Polymer.IronFormElementBehavior,
Polymer.PaperInputBehavior
]
});
Polymer.IronFitBehavior = {
properties: {
sizingTarget: {
type: Object,
value: function () {
return this;
}
},
fitInto: {
type: Object,
value: window
},
autoFitOnAttach: {
type: Boolean,
value: false
},
_fitInfo: { type: Object }
},
get _fitWidth() {
var fitWidth;
if (this.fitInto === window) {
fitWidth = this.fitInto.innerWidth;
} else {
fitWidth = this.fitInto.getBoundingClientRect().width;
}
return fitWidth;
},
get _fitHeight() {
var fitHeight;
if (this.fitInto === window) {
fitHeight = this.fitInto.innerHeight;
} else {
fitHeight = this.fitInto.getBoundingClientRect().height;
}
return fitHeight;
},
get _fitLeft() {
var fitLeft;
if (this.fitInto === window) {
fitLeft = 0;
} else {
fitLeft = this.fitInto.getBoundingClientRect().left;
}
return fitLeft;
},
get _fitTop() {
var fitTop;
if (this.fitInto === window) {
fitTop = 0;
} else {
fitTop = this.fitInto.getBoundingClientRect().top;
}
return fitTop;
},
attached: function () {
if (this.autoFitOnAttach) {
if (window.getComputedStyle(this).display === 'none') {
setTimeout(function () {
this.fit();
}.bind(this));
} else {
this.fit();
}
}
},
fit: function () {
this._discoverInfo();
this.constrain();
this.center();
},
_discoverInfo: function () {
if (this._fitInfo) {
return;
}
var target = window.getComputedStyle(this);
var sizer = window.getComputedStyle(this.sizingTarget);
this._fitInfo = {
inlineStyle: {
top: this.style.top || '',
left: this.style.left || ''
},
positionedBy: {
vertically: target.top !== 'auto' ? 'top' : target.bottom !== 'auto' ? 'bottom' : null,
horizontally: target.left !== 'auto' ? 'left' : target.right !== 'auto' ? 'right' : null,
css: target.position
},
sizedBy: {
height: sizer.maxHeight !== 'none',
width: sizer.maxWidth !== 'none'
},
margin: {
top: parseInt(target.marginTop, 10) || 0,
right: parseInt(target.marginRight, 10) || 0,
bottom: parseInt(target.marginBottom, 10) || 0,
left: parseInt(target.marginLeft, 10) || 0
}
};
},
resetFit: function () {
if (!this._fitInfo || !this._fitInfo.sizedBy.width) {
this.sizingTarget.style.maxWidth = '';
}
if (!this._fitInfo || !this._fitInfo.sizedBy.height) {
this.sizingTarget.style.maxHeight = '';
}
this.style.top = this._fitInfo ? this._fitInfo.inlineStyle.top : '';
this.style.left = this._fitInfo ? this._fitInfo.inlineStyle.left : '';
if (this._fitInfo) {
this.style.position = this._fitInfo.positionedBy.css;
}
this._fitInfo = null;
},
refit: function () {
this.resetFit();
this.fit();
},
constrain: function () {
var info = this._fitInfo;
if (!this._fitInfo.positionedBy.vertically) {
this.style.top = '0px';
}
if (!this._fitInfo.positionedBy.horizontally) {
this.style.left = '0px';
}
if (!this._fitInfo.positionedBy.vertically || !this._fitInfo.positionedBy.horizontally) {
this.style.position = 'fixed';
}
this.sizingTarget.style.boxSizing = 'border-box';
var rect = this.getBoundingClientRect();
if (!info.sizedBy.height) {
this._sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
}
if (!info.sizedBy.width) {
this._sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
}
},
_sizeDimension: function (rect, positionedBy, start, end, extent) {
var info = this._fitInfo;
var max = extent === 'Width' ? this._fitWidth : this._fitHeight;
var flip = positionedBy === end;
var offset = flip ? max - rect[end] : rect[start];
var margin = info.margin[flip ? start : end];
var offsetExtent = 'offset' + extent;
var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
this.sizingTarget.style['max' + extent] = max - margin - offset - sizingOffset + 'px';
},
center: function () {
var positionedBy = this._fitInfo.positionedBy;
if (positionedBy.vertically && positionedBy.horizontally) {
return;
}
this.style.position = 'fixed';
if (!positionedBy.vertically) {
this.style.top = '0px';
}
if (!positionedBy.horizontally) {
this.style.left = '0px';
}
var rect = this.getBoundingClientRect();
if (!positionedBy.vertically) {
var top = this._fitTop - rect.top + (this._fitHeight - rect.height) / 2;
this.style.top = top + 'px';
}
if (!positionedBy.horizontally) {
var left = this._fitLeft - rect.left + (this._fitWidth - rect.width) / 2;
this.style.left = left + 'px';
}
}
};
Polymer.IronOverlayManagerClass = function () {
this._overlays = [];
this._minimumZ = 101;
this._backdropElement = null;
var clickEvent = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
document.addEventListener(clickEvent, this._onCaptureClick.bind(this), true);
document.addEventListener('focus', this._onCaptureFocus.bind(this), true);
document.addEventListener('keydown', this._onCaptureKeyDown.bind(this), true);
};
Polymer.IronOverlayManagerClass.prototype = {
constructor: Polymer.IronOverlayManagerClass,
get backdropElement() {
if (!this._backdropElement) {
this._backdropElement = document.createElement('iron-overlay-backdrop');
}
return this._backdropElement;
},
get deepActiveElement() {
var active = document.activeElement || document.body;
while (active.root && Polymer.dom(active.root).activeElement) {
active = Polymer.dom(active.root).activeElement;
}
return active;
},
_bringOverlayAtIndexToFront: function (i) {
var overlay = this._overlays[i];
if (!overlay) {
return;
}
var lastI = this._overlays.length - 1;
var currentOverlay = this._overlays[lastI];
if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
lastI--;
}
if (i >= lastI) {
return;
}
var minimumZ = Math.max(this.currentOverlayZ(), this._minimumZ);
if (this._getZ(overlay) <= minimumZ) {
this._applyOverlayZ(overlay, minimumZ);
}
while (i < lastI) {
this._overlays[i] = this._overlays[i + 1];
i++;
}
this._overlays[lastI] = overlay;
},
addOrRemoveOverlay: function (overlay) {
if (overlay.opened) {
this.addOverlay(overlay);
} else {
this.removeOverlay(overlay);
}
this.trackBackdrop();
},
addOverlay: function (overlay) {
var i = this._overlays.indexOf(overlay);
if (i >= 0) {
this._bringOverlayAtIndexToFront(i);
return;
}
var insertionIndex = this._overlays.length;
var currentOverlay = this._overlays[insertionIndex - 1];
var minimumZ = Math.max(this._getZ(currentOverlay), this._minimumZ);
var newZ = this._getZ(overlay);
if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
this._applyOverlayZ(currentOverlay, minimumZ);
insertionIndex--;
var previousOverlay = this._overlays[insertionIndex - 1];
minimumZ = Math.max(this._getZ(previousOverlay), this._minimumZ);
}
if (newZ <= minimumZ) {
this._applyOverlayZ(overlay, minimumZ);
}
this._overlays.splice(insertionIndex, 0, overlay);
var element = this.deepActiveElement;
overlay.restoreFocusNode = this._overlayParent(element) ? null : element;
},
removeOverlay: function (overlay) {
var i = this._overlays.indexOf(overlay);
if (i === -1) {
return;
}
this._overlays.splice(i, 1);
var node = overlay.restoreFocusOnClose ? overlay.restoreFocusNode : null;
overlay.restoreFocusNode = null;
if (node && Polymer.dom(document.body).deepContains(node)) {
node.focus();
}
},
currentOverlay: function () {
var i = this._overlays.length - 1;
return this._overlays[i];
},
currentOverlayZ: function () {
return this._getZ(this.currentOverlay());
},
ensureMinimumZ: function (minimumZ) {
this._minimumZ = Math.max(this._minimumZ, minimumZ);
},
focusOverlay: function () {
var current = this.currentOverlay();
if (current && !current.transitioning) {
current._applyFocus();
}
},
trackBackdrop: function () {
this.backdropElement.style.zIndex = this.backdropZ();
},
getBackdrops: function () {
var backdrops = [];
for (var i = 0; i < this._overlays.length; i++) {
if (this._overlays[i].withBackdrop) {
backdrops.push(this._overlays[i]);
}
}
return backdrops;
},
backdropZ: function () {
return this._getZ(this._overlayWithBackdrop()) - 1;
},
_overlayWithBackdrop: function () {
for (var i = 0; i < this._overlays.length; i++) {
if (this._overlays[i].withBackdrop) {
return this._overlays[i];
}
}
},
_getZ: function (overlay) {
var z = this._minimumZ;
if (overlay) {
var z1 = Number(overlay.style.zIndex || window.getComputedStyle(overlay).zIndex);
if (z1 === z1) {
z = z1;
}
}
return z;
},
_setZ: function (element, z) {
element.style.zIndex = z;
},
_applyOverlayZ: function (overlay, aboveZ) {
this._setZ(overlay, aboveZ + 2);
},
_overlayParent: function (node) {
while (node && node !== document.body) {
if (node._manager === this) {
return node;
}
node = Polymer.dom(node).parentNode || node.host;
}
},
_overlayInPath: function (path) {
path = path || [];
for (var i = 0; i < path.length; i++) {
if (path[i]._manager === this) {
return path[i];
}
}
},
_onCaptureClick: function (event) {
var overlay = this.currentOverlay();
if (overlay && this._overlayInPath(Polymer.dom(event).path) !== overlay) {
overlay._onCaptureClick(event);
}
},
_onCaptureFocus: function (event) {
var overlay = this.currentOverlay();
if (overlay) {
overlay._onCaptureFocus(event);
}
},
_onCaptureKeyDown: function (event) {
var overlay = this.currentOverlay();
if (overlay) {
if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'esc')) {
overlay._onCaptureEsc(event);
} else if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'tab')) {
overlay._onCaptureTab(event);
}
}
},
_shouldBeBehindOverlay: function (overlay1, overlay2) {
var o1 = overlay1;
var o2 = overlay2;
return !o1.alwaysOnTop && o2.alwaysOnTop;
}
};
Polymer.IronOverlayManager = new Polymer.IronOverlayManagerClass();
(function () {
Polymer({
is: 'iron-overlay-backdrop',
properties: {
opened: {
readOnly: true,
reflectToAttribute: true,
type: Boolean,
value: false
},
_manager: {
type: Object,
value: Polymer.IronOverlayManager
}
},
listeners: { 'transitionend': '_onTransitionend' },
prepare: function () {
if (!this.parentNode) {
Polymer.dom(document.body).appendChild(this);
}
},
open: function () {
if (this._manager.getBackdrops().length < 2) {
this._setOpened(true);
}
},
close: function () {
if (this._manager.getBackdrops().length === 0) {
var cs = getComputedStyle(this);
var noAnimation = cs.transitionDuration === '0s' || cs.opacity == 0;
this._setOpened(false);
if (noAnimation) {
this.complete();
}
}
},
complete: function () {
if (this._manager.getBackdrops().length === 0 && this.parentNode) {
Polymer.dom(this.parentNode).removeChild(this);
}
},
_onTransitionend: function (event) {
if (event && event.target === this) {
this.complete();
}
}
});
}());
(function () {
'use strict';
Polymer.IronOverlayBehaviorImpl = {
properties: {
opened: {
observer: '_openedChanged',
type: Boolean,
value: false,
notify: true
},
canceled: {
observer: '_canceledChanged',
readOnly: true,
type: Boolean,
value: false
},
withBackdrop: {
observer: '_withBackdropChanged',
type: Boolean
},
noAutoFocus: {
type: Boolean,
value: false
},
noCancelOnEscKey: {
type: Boolean,
value: false
},
noCancelOnOutsideClick: {
type: Boolean,
value: false
},
closingReason: { type: Object },
restoreFocusOnClose: {
type: Boolean,
value: false
},
alwaysOnTop: { type: Boolean },
_manager: {
type: Object,
value: Polymer.IronOverlayManager
},
_focusedChild: { type: Object }
},
listeners: { 'iron-resize': '_onIronResize' },
get backdropElement() {
return this._manager.backdropElement;
},
get _focusNode() {
return this._focusedChild || Polymer.dom(this).querySelector('[autofocus]') || this;
},
get _focusableNodes() {
var FOCUSABLE_WITH_DISABLED = [
'a[href]',
'area[href]',
'iframe',
'[tabindex]',
'[contentEditable=true]'
];
var FOCUSABLE_WITHOUT_DISABLED = [
'input',
'select',
'textarea',
'button'
];
var selector = FOCUSABLE_WITH_DISABLED.join(':not([tabindex="-1"]),') + ':not([tabindex="-1"]),' + FOCUSABLE_WITHOUT_DISABLED.join(':not([disabled]):not([tabindex="-1"]),') + ':not([disabled]):not([tabindex="-1"])';
var focusables = Polymer.dom(this).querySelectorAll(selector);
if (this.tabIndex >= 0) {
focusables.splice(0, 0, this);
}
return focusables.sort(function (a, b) {
if (a.tabIndex === b.tabIndex) {
return 0;
}
if (a.tabIndex === 0 || a.tabIndex > b.tabIndex) {
return 1;
}
return -1;
});
},
ready: function () {
this.__isAnimating = false;
this.__shouldRemoveTabIndex = false;
this.__firstFocusableNode = this.__lastFocusableNode = null;
this.__openChangedAsync = null;
this.__onIronResizeAsync = null;
this._ensureSetup();
},
attached: function () {
if (this.opened) {
this._openedChanged();
}
this._observer = Polymer.dom(this).observeNodes(this._onNodesChange);
},
detached: function () {
Polymer.dom(this).unobserveNodes(this._observer);
this._observer = null;
this.opened = false;
if (this.withBackdrop) {
this.backdropElement.close();
}
},
toggle: function () {
this._setCanceled(false);
this.opened = !this.opened;
},
open: function () {
this._setCanceled(false);
this.opened = true;
},
close: function () {
this._setCanceled(false);
this.opened = false;
},
cancel: function (event) {
var cancelEvent = this.fire('iron-overlay-canceled', event, { cancelable: true });
if (cancelEvent.defaultPrevented) {
return;
}
this._setCanceled(true);
this.opened = false;
},
_ensureSetup: function () {
if (this._overlaySetup) {
return;
}
this._overlaySetup = true;
this.style.outline = 'none';
this.style.display = 'none';
},
_openedChanged: function () {
if (this.opened) {
this.removeAttribute('aria-hidden');
} else {
this.setAttribute('aria-hidden', 'true');
}
if (!this._overlaySetup) {
return;
}
this._manager.addOrRemoveOverlay(this);
this.__isAnimating = true;
if (this.__openChangedAsync) {
window.cancelAnimationFrame(this.__openChangedAsync);
}
if (this.opened) {
if (this.withBackdrop) {
this.backdropElement.prepare();
}
this.__openChangedAsync = window.requestAnimationFrame(function () {
this.__openChangedAsync = null;
this._prepareRenderOpened();
this._renderOpened();
}.bind(this));
} else {
this._renderClosed();
}
},
_canceledChanged: function () {
this.closingReason = this.closingReason || {};
this.closingReason.canceled = this.canceled;
},
_withBackdropChanged: function () {
if (this.withBackdrop && !this.hasAttribute('tabindex')) {
this.setAttribute('tabindex', '-1');
this.__shouldRemoveTabIndex = true;
} else if (this.__shouldRemoveTabIndex) {
this.removeAttribute('tabindex');
this.__shouldRemoveTabIndex = false;
}
if (this.opened) {
this._manager.trackBackdrop();
if (this.withBackdrop) {
this.backdropElement.prepare();
this.async(function () {
this.backdropElement.open();
}, 1);
} else {
this.backdropElement.close();
}
}
},
_prepareRenderOpened: function () {
this._preparePositioning();
this.refit();
this._finishPositioning();
if (this.noAutoFocus && document.activeElement === this._focusNode) {
this._focusNode.blur();
}
},
_renderOpened: function () {
if (this.withBackdrop) {
this.backdropElement.open();
}
this._finishRenderOpened();
},
_renderClosed: function () {
if (this.withBackdrop) {
this.backdropElement.close();
}
this._finishRenderClosed();
},
_finishRenderOpened: function () {
this._applyFocus();
this.notifyResize();
this.__isAnimating = false;
this.fire('iron-overlay-opened');
},
_finishRenderClosed: function () {
this.style.display = 'none';
this.style.zIndex = '';
this._applyFocus();
this.notifyResize();
this.__isAnimating = false;
this.fire('iron-overlay-closed', this.closingReason);
},
_preparePositioning: function () {
this.style.transition = this.style.webkitTransition = 'none';
this.style.transform = this.style.webkitTransform = 'none';
this.style.display = '';
},
_finishPositioning: function () {
this.style.display = 'none';
this.scrollTop = this.scrollTop;
this.style.transition = this.style.webkitTransition = '';
this.style.transform = this.style.webkitTransform = '';
this.style.display = '';
this.scrollTop = this.scrollTop;
},
_applyFocus: function () {
if (this.opened) {
if (!this.noAutoFocus) {
this._focusNode.focus();
}
} else {
this._focusNode.blur();
this._focusedChild = null;
this._manager.focusOverlay();
}
},
_onCaptureClick: function (event) {
if (!this.noCancelOnOutsideClick) {
this.cancel(event);
}
},
_onCaptureFocus: function (event) {
if (!this.withBackdrop) {
return;
}
var path = Polymer.dom(event).path;
if (path.indexOf(this) === -1) {
event.stopPropagation();
this._applyFocus();
} else {
this._focusedChild = path[0];
}
},
_onCaptureEsc: function (event) {
if (!this.noCancelOnEscKey) {
this.cancel(event);
}
},
_onCaptureTab: function (event) {
var shift = event.shiftKey;
var nodeToCheck = shift ? this.__firstFocusableNode : this.__lastFocusableNode;
var nodeToSet = shift ? this.__lastFocusableNode : this.__firstFocusableNode;
if (this.withBackdrop && this._focusedChild === nodeToCheck) {
this._focusedChild = nodeToSet;
}
},
_onIronResize: function () {
if (this.__onIronResizeAsync) {
window.cancelAnimationFrame(this.__onIronResizeAsync);
this.__onIronResizeAsync = null;
}
if (this.opened && !this.__isAnimating) {
this.__onIronResizeAsync = window.requestAnimationFrame(function () {
this.__onIronResizeAsync = null;
this.refit();
}.bind(this));
}
},
_onNodesChange: function () {
if (this.opened && !this.__isAnimating) {
this.notifyResize();
}
var focusableNodes = this._focusableNodes;
this.__firstFocusableNode = focusableNodes[0];
this.__lastFocusableNode = focusableNodes[focusableNodes.length - 1];
}
};
Polymer.IronOverlayBehavior = [
Polymer.IronFitBehavior,
Polymer.IronResizableBehavior,
Polymer.IronOverlayBehaviorImpl
];
}());
Polymer.NeonAnimationBehavior = {
properties: {
animationTiming: {
type: Object,
value: function () {
return {
duration: 500,
easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
fill: 'both'
};
}
}
},
isNeonAnimation: true,
timingFromConfig: function (config) {
if (config.timing) {
for (var property in config.timing) {
this.animationTiming[property] = config.timing[property];
}
}
return this.animationTiming;
},
setPrefixedProperty: function (node, property, value) {
var map = {
'transform': ['webkitTransform'],
'transformOrigin': [
'mozTransformOrigin',
'webkitTransformOrigin'
]
};
var prefixes = map[property];
for (var prefix, index = 0; prefix = prefixes[index]; index++) {
node.style[prefix] = value;
}
node.style[property] = value;
},
complete: function () {
}
};
!function (a, b) {
b['true'] = a;
var c = {}, d = {}, e = {}, f = null;
!function (a) {
function b(a) {
if ('number' == typeof a)
return a;
var b = {};
for (var c in a)
b[c] = a[c];
return b;
}
function c() {
this._delay = 0, this._endDelay = 0, this._fill = 'none', this._iterationStart = 0, this._iterations = 1, this._duration = 0, this._playbackRate = 1, this._direction = 'normal', this._easing = 'linear';
}
function d(b, d) {
var e = new c();
return d && (e.fill = 'both', e.duration = 'auto'), 'number' != typeof b || isNaN(b) ? void 0 !== b && Object.getOwnPropertyNames(b).forEach(function (c) {
if ('auto' != b[c]) {
if (('number' == typeof e[c] || 'duration' == c) && ('number' != typeof b[c] || isNaN(b[c])))
return;
if ('fill' == c && -1 == s.indexOf(b[c]))
return;
if ('direction' == c && -1 == t.indexOf(b[c]))
return;
if ('playbackRate' == c && 1 !== b[c] && a.isDeprecated('AnimationEffectTiming.playbackRate', '2014-11-28', 'Use Animation.playbackRate instead.'))
return;
e[c] = b[c];
}
}) : e.duration = b, e;
}
function e(a) {
return 'number' == typeof a && (a = isNaN(a) ? { duration: 0 } : { duration: a }), a;
}
function f(b, c) {
b = a.numericTimingToObject(b);
var e = d(b, c);
return e._easing = i(e.easing), e;
}
function g(a, b, c, d) {
return 0 > a || a > 1 || 0 > c || c > 1 ? B : function (e) {
function f(a, b, c) {
return 3 * a * (1 - c) * (1 - c) * c + 3 * b * (1 - c) * c * c + c * c * c;
}
if (0 == e || 1 == e)
return e;
for (var g = 0, h = 1;;) {
var i = (g + h) / 2, j = f(a, c, i);
if (Math.abs(e - j) < 0.001)
return f(b, d, i);
e > j ? g = i : h = i;
}
};
}
function h(a, b) {
return function (c) {
if (c >= 1)
return 1;
var d = 1 / a;
return c += b * d, c - c % d;
};
}
function i(a) {
var b = z.exec(a);
if (b)
return g.apply(this, b.slice(1).map(Number));
var c = A.exec(a);
if (c)
return h(Number(c[1]), {
start: u,
middle: v,
end: w
}[c[2]]);
var d = x[a];
return d ? d : B;
}
function j(a) {
return Math.abs(k(a) / a.playbackRate);
}
function k(a) {
return a.duration * a.iterations;
}
function l(a, b, c) {
return null == b ? C : b < c.delay ? D : b >= c.delay + a ? E : F;
}
function m(a, b, c, d, e) {
switch (d) {
case D:
return 'backwards' == b || 'both' == b ? 0 : null;
case F:
return c - e;
case E:
return 'forwards' == b || 'both' == b ? a : null;
case C:
return null;
}
}
function n(a, b, c, d) {
return (d.playbackRate < 0 ? b - a : b) * d.playbackRate + c;
}
function o(a, b, c, d, e) {
return 1 / 0 === c || c === -1 / 0 || c - d == b && e.iterations && (e.iterations + e.iterationStart) % 1 == 0 ? a : c % a;
}
function p(a, b, c, d) {
return 0 === c ? 0 : b == a ? d.iterationStart + d.iterations - 1 : Math.floor(c / a);
}
function q(a, b, c, d) {
var e = a % 2 >= 1, f = 'normal' == d.direction || d.direction == (e ? 'alternate-reverse' : 'alternate'), g = f ? c : b - c, h = g / b;
return b * d.easing(h);
}
function r(a, b, c) {
var d = l(a, b, c), e = m(a, c.fill, b, d, c.delay);
if (null === e)
return null;
if (0 === a)
return d === D ? 0 : 1;
var f = c.iterationStart * c.duration, g = n(a, e, f, c), h = o(c.duration, k(c), g, f, c), i = p(c.duration, h, g, c);
return q(i, c.duration, h, c) / c.duration;
}
var s = 'backwards|forwards|both|none'.split('|'), t = 'reverse|alternate|alternate-reverse'.split('|');
c.prototype = {
_setMember: function (b, c) {
this['_' + b] = c, this._effect && (this._effect._timingInput[b] = c, this._effect._timing = a.normalizeTimingInput(a.normalizeTimingInput(this._effect._timingInput)), this._effect.activeDuration = a.calculateActiveDuration(this._effect._timing), this._effect._animation && this._effect._animation._rebuildUnderlyingAnimation());
},
get playbackRate() {
return this._playbackRate;
},
set delay(a) {
this._setMember('delay', a);
},
get delay() {
return this._delay;
},
set endDelay(a) {
this._setMember('endDelay', a);
},
get endDelay() {
return this._endDelay;
},
set fill(a) {
this._setMember('fill', a);
},
get fill() {
return this._fill;
},
set iterationStart(a) {
this._setMember('iterationStart', a);
},
get iterationStart() {
return this._iterationStart;
},
set duration(a) {
this._setMember('duration', a);
},
get duration() {
return this._duration;
},
set direction(a) {
this._setMember('direction', a);
},
get direction() {
return this._direction;
},
set easing(a) {
this._setMember('easing', a);
},
get easing() {
return this._easing;
},
set iterations(a) {
this._setMember('iterations', a);
},
get iterations() {
return this._iterations;
}
};
var u = 1, v = 0.5, w = 0, x = {
ease: g(0.25, 0.1, 0.25, 1),
'ease-in': g(0.42, 0, 1, 1),
'ease-out': g(0, 0, 0.58, 1),
'ease-in-out': g(0.42, 0, 0.58, 1),
'step-start': h(1, u),
'step-middle': h(1, v),
'step-end': h(1, w)
}, y = '\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*', z = new RegExp('cubic-bezier\\(' + y + ',' + y + ',' + y + ',' + y + '\\)'), A = /steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/, B = function (a) {
return a;
}, C = 0, D = 1, E = 2, F = 3;
a.cloneTimingInput = b, a.makeTiming = d, a.numericTimingToObject = e, a.normalizeTimingInput = f, a.calculateActiveDuration = j, a.calculateTimeFraction = r, a.calculatePhase = l, a.toTimingFunction = i;
}(c, f), function (a) {
function b(a, b) {
return a in h ? h[a][b] || b : b;
}
function c(a, c, d) {
var g = e[a];
if (g) {
f.style[a] = c;
for (var h in g) {
var i = g[h], j = f.style[i];
d[i] = b(i, j);
}
} else
d[a] = b(a, c);
}
function d(b) {
function d() {
var a = e.length;
null == e[a - 1].offset && (e[a - 1].offset = 1), a > 1 && null == e[0].offset && (e[0].offset = 0);
for (var b = 0, c = e[0].offset, d = 1; a > d; d++) {
var f = e[d].offset;
if (null != f) {
for (var g = 1; d - b > g; g++)
e[b + g].offset = c + (f - c) * g / (d - b);
b = d, c = f;
}
}
}
if (!Array.isArray(b) && null !== b)
throw new TypeError('Keyframes must be null or an array of keyframes');
if (null == b)
return [];
for (var e = b.map(function (b) {
var d = {};
for (var e in b) {
var f = b[e];
if ('offset' == e) {
if (null != f && (f = Number(f), !isFinite(f)))
throw new TypeError('keyframe offsets must be numbers.');
} else {
if ('composite' == e)
throw {
type: DOMException.NOT_SUPPORTED_ERR,
name: 'NotSupportedError',
message: 'add compositing is not supported'
};
f = 'easing' == e ? a.toTimingFunction(f) : '' + f;
}
c(e, f, d);
}
return void 0 == d.offset && (d.offset = null), void 0 == d.easing && (d.easing = a.toTimingFunction('linear')), d;
}), f = !0, g = -1 / 0, h = 0; h < e.length; h++) {
var i = e[h].offset;
if (null != i) {
if (g > i)
throw {
code: DOMException.INVALID_MODIFICATION_ERR,
name: 'InvalidModificationError',
message: 'Keyframes are not loosely sorted by offset. Sort or specify offsets.'
};
g = i;
} else
f = !1;
}
return e = e.filter(function (a) {
return a.offset >= 0 && a.offset <= 1;
}), f || d(), e;
}
var e = {
background: [
'backgroundImage',
'backgroundPosition',
'backgroundSize',
'backgroundRepeat',
'backgroundAttachment',
'backgroundOrigin',
'backgroundClip',
'backgroundColor'
],
border: [
'borderTopColor',
'borderTopStyle',
'borderTopWidth',
'borderRightColor',
'borderRightStyle',
'borderRightWidth',
'borderBottomColor',
'borderBottomStyle',
'borderBottomWidth',
'borderLeftColor',
'borderLeftStyle',
'borderLeftWidth'
],
borderBottom: [
'borderBottomWidth',
'borderBottomStyle',
'borderBottomColor'
],
borderColor: [
'borderTopColor',
'borderRightColor',
'borderBottomColor',
'borderLeftColor'
],
borderLeft: [
'borderLeftWidth',
'borderLeftStyle',
'borderLeftColor'
],
borderRadius: [
'borderTopLeftRadius',
'borderTopRightRadius',
'borderBottomRightRadius',
'borderBottomLeftRadius'
],
borderRight: [
'borderRightWidth',
'borderRightStyle',
'borderRightColor'
],
borderTop: [
'borderTopWidth',
'borderTopStyle',
'borderTopColor'
],
borderWidth: [
'borderTopWidth',
'borderRightWidth',
'borderBottomWidth',
'borderLeftWidth'
],
flex: [
'flexGrow',
'flexShrink',
'flexBasis'
],
font: [
'fontFamily',
'fontSize',
'fontStyle',
'fontVariant',
'fontWeight',
'lineHeight'
],
margin: [
'marginTop',
'marginRight',
'marginBottom',
'marginLeft'
],
outline: [
'outlineColor',
'outlineStyle',
'outlineWidth'
],
padding: [
'paddingTop',
'paddingRight',
'paddingBottom',
'paddingLeft'
]
}, f = document.createElementNS('http://www.w3.org/1999/xhtml', 'div'), g = {
thin: '1px',
medium: '3px',
thick: '5px'
}, h = {
borderBottomWidth: g,
borderLeftWidth: g,
borderRightWidth: g,
borderTopWidth: g,
fontSize: {
'xx-small': '60%',
'x-small': '75%',
small: '89%',
medium: '100%',
large: '120%',
'x-large': '150%',
'xx-large': '200%'
},
fontWeight: {
normal: '400',
bold: '700'
},
outlineWidth: g,
textShadow: { none: '0px 0px 0px transparent' },
boxShadow: { none: '0px 0px 0px 0px transparent' }
};
a.normalizeKeyframes = d;
}(c, f), function (a) {
var b = {};
a.isDeprecated = function (a, c, d, e) {
var f = e ? 'are' : 'is', g = new Date(), h = new Date(c);
return h.setMonth(h.getMonth() + 3), h > g ? (a in b || console.warn('Web Animations: ' + a + ' ' + f + ' deprecated and will stop working on ' + h.toDateString() + '. ' + d), b[a] = !0, !1) : !0;
}, a.deprecated = function (b, c, d, e) {
var f = e ? 'are' : 'is';
if (a.isDeprecated(b, c, d, e))
throw new Error(b + ' ' + f + ' no longer supported. ' + d);
};
}(c), function () {
if (document.documentElement.animate) {
var a = document.documentElement.animate([], 0), b = !0;
if (a && (b = !1, 'play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState'.split('|').forEach(function (c) {
void 0 === a[c] && (b = !0);
})), !b)
return;
}
!function (a, b) {
function c(a) {
for (var b = {}, c = 0; c < a.length; c++)
for (var d in a[c])
if ('offset' != d && 'easing' != d && 'composite' != d) {
var e = {
offset: a[c].offset,
easing: a[c].easing,
value: a[c][d]
};
b[d] = b[d] || [], b[d].push(e);
}
for (var f in b) {
var g = b[f];
if (0 != g[0].offset || 1 != g[g.length - 1].offset)
throw {
type: DOMException.NOT_SUPPORTED_ERR,
name: 'NotSupportedError',
message: 'Partial keyframes are not supported'
};
}
return b;
}
function d(a) {
var c = [];
for (var d in a)
for (var e = a[d], f = 0; f < e.length - 1; f++) {
var g = e[f].offset, h = e[f + 1].offset, i = e[f].value, j = e[f + 1].value;
g == h && (1 == h ? i = j : j = i), c.push({
startTime: g,
endTime: h,
easing: e[f].easing,
property: d,
interpolation: b.propertyInterpolation(d, i, j)
});
}
return c.sort(function (a, b) {
return a.startTime - b.startTime;
}), c;
}
b.convertEffectInput = function (e) {
var f = a.normalizeKeyframes(e), g = c(f), h = d(g);
return function (a, c) {
if (null != c)
h.filter(function (a) {
return 0 >= c && 0 == a.startTime || c >= 1 && 1 == a.endTime || c >= a.startTime && c <= a.endTime;
}).forEach(function (d) {
var e = c - d.startTime, f = d.endTime - d.startTime, g = 0 == f ? 0 : d.easing(e / f);
b.apply(a, d.property, d.interpolation(g));
});
else
for (var d in g)
'offset' != d && 'easing' != d && 'composite' != d && b.clear(a, d);
};
};
}(c, d, f), function (a) {
function b(a, b, c) {
e[c] = e[c] || [], e[c].push([
a,
b
]);
}
function c(a, c, d) {
for (var e = 0; e < d.length; e++) {
var f = d[e];
b(a, c, f), /-/.test(f) && b(a, c, f.replace(/-(.)/g, function (a, b) {
return b.toUpperCase();
}));
}
}
function d(b, c, d) {
if ('initial' == c || 'initial' == d) {
var g = b.replace(/-(.)/g, function (a, b) {
return b.toUpperCase();
});
'initial' == c && (c = f[g]), 'initial' == d && (d = f[g]);
}
for (var h = c == d ? [] : e[b], i = 0; h && i < h.length; i++) {
var j = h[i][0](c), k = h[i][0](d);
if (void 0 !== j && void 0 !== k) {
var l = h[i][1](j, k);
if (l) {
var m = a.Interpolation.apply(null, l);
return function (a) {
return 0 == a ? c : 1 == a ? d : m(a);
};
}
}
}
return a.Interpolation(!1, !0, function (a) {
return a ? d : c;
});
}
var e = {};
a.addPropertiesHandler = c;
var f = {
backgroundColor: 'transparent',
backgroundPosition: '0% 0%',
borderBottomColor: 'currentColor',
borderBottomLeftRadius: '0px',
borderBottomRightRadius: '0px',
borderBottomWidth: '3px',
borderLeftColor: 'currentColor',
borderLeftWidth: '3px',
borderRightColor: 'currentColor',
borderRightWidth: '3px',
borderSpacing: '2px',
borderTopColor: 'currentColor',
borderTopLeftRadius: '0px',
borderTopRightRadius: '0px',
borderTopWidth: '3px',
bottom: 'auto',
clip: 'rect(0px, 0px, 0px, 0px)',
color: 'black',
fontSize: '100%',
fontWeight: '400',
height: 'auto',
left: 'auto',
letterSpacing: 'normal',
lineHeight: '120%',
marginBottom: '0px',
marginLeft: '0px',
marginRight: '0px',
marginTop: '0px',
maxHeight: 'none',
maxWidth: 'none',
minHeight: '0px',
minWidth: '0px',
opacity: '1.0',
outlineColor: 'invert',
outlineOffset: '0px',
outlineWidth: '3px',
paddingBottom: '0px',
paddingLeft: '0px',
paddingRight: '0px',
paddingTop: '0px',
right: 'auto',
textIndent: '0px',
textShadow: '0px 0px 0px transparent',
top: 'auto',
transform: '',
verticalAlign: '0px',
visibility: 'visible',
width: 'auto',
wordSpacing: 'normal',
zIndex: 'auto'
};
a.propertyInterpolation = d;
}(d, f), function (a, b) {
function c(b) {
var c = a.calculateActiveDuration(b), d = function (d) {
return a.calculateTimeFraction(c, d, b);
};
return d._totalDuration = b.delay + c + b.endDelay, d._isCurrent = function (d) {
var e = a.calculatePhase(c, d, b);
return e === PhaseActive || e === PhaseBefore;
}, d;
}
b.KeyframeEffect = function (d, e, f) {
var g, h = c(a.normalizeTimingInput(f)), i = b.convertEffectInput(e), j = function () {
i(d, g);
};
return j._update = function (a) {
return g = h(a), null !== g;
}, j._clear = function () {
i(d, null);
}, j._hasSameTarget = function (a) {
return d === a;
}, j._isCurrent = h._isCurrent, j._totalDuration = h._totalDuration, j;
}, b.NullEffect = function (a) {
var b = function () {
a && (a(), a = null);
};
return b._update = function () {
return null;
}, b._totalDuration = 0, b._isCurrent = function () {
return !1;
}, b._hasSameTarget = function () {
return !1;
}, b;
};
}(c, d, f), function (a) {
a.apply = function (b, c, d) {
b.style[a.propertyName(c)] = d;
}, a.clear = function (b, c) {
b.style[a.propertyName(c)] = '';
};
}(d, f), function (a) {
window.Element.prototype.animate = function (b, c) {
return a.timeline._play(a.KeyframeEffect(this, b, c));
};
}(d), function (a) {
function b(a, c, d) {
if ('number' == typeof a && 'number' == typeof c)
return a * (1 - d) + c * d;
if ('boolean' == typeof a && 'boolean' == typeof c)
return 0.5 > d ? a : c;
if (a.length == c.length) {
for (var e = [], f = 0; f < a.length; f++)
e.push(b(a[f], c[f], d));
return e;
}
throw 'Mismatched interpolation arguments ' + a + ':' + c;
}
a.Interpolation = function (a, c, d) {
return function (e) {
return d(b(a, c, e));
};
};
}(d, f), function (a, b) {
a.sequenceNumber = 0;
var c = function (a, b, c) {
this.target = a, this.currentTime = b, this.timelineTime = c, this.type = 'finish', this.bubbles = !1, this.cancelable = !1, this.currentTarget = a, this.defaultPrevented = !1, this.eventPhase = Event.AT_TARGET, this.timeStamp = Date.now();
};
b.Animation = function (b) {
this._sequenceNumber = a.sequenceNumber++, this._currentTime = 0, this._startTime = null, this._paused = !1, this._playbackRate = 1, this._inTimeline = !0, this._finishedFlag = !1, this.onfinish = null, this._finishHandlers = [], this._effect = b, this._inEffect = this._effect._update(0), this._idle = !0, this._currentTimePending = !1;
}, b.Animation.prototype = {
_ensureAlive: function () {
this._inEffect = this._effect._update(this.playbackRate < 0 && 0 === this.currentTime ? -1 : this.currentTime), this._inTimeline || !this._inEffect && this._finishedFlag || (this._inTimeline = !0, b.timeline._animations.push(this));
},
_tickCurrentTime: function (a, b) {
a != this._currentTime && (this._currentTime = a, this._isFinished && !b && (this._currentTime = this._playbackRate > 0 ? this._totalDuration : 0), this._ensureAlive());
},
get currentTime() {
return this._idle || this._currentTimePending ? null : this._currentTime;
},
set currentTime(a) {
a = +a, isNaN(a) || (b.restart(), this._paused || null == this._startTime || (this._startTime = this._timeline.currentTime - a / this._playbackRate), this._currentTimePending = !1, this._currentTime != a && (this._tickCurrentTime(a, !0), b.invalidateEffects()));
},
get startTime() {
return this._startTime;
},
set startTime(a) {
a = +a, isNaN(a) || this._paused || this._idle || (this._startTime = a, this._tickCurrentTime((this._timeline.currentTime - this._startTime) * this.playbackRate), b.invalidateEffects());
},
get playbackRate() {
return this._playbackRate;
},
set playbackRate(a) {
if (a != this._playbackRate) {
var b = this.currentTime;
this._playbackRate = a, this._startTime = null, 'paused' != this.playState && 'idle' != this.playState && this.play(), null != b && (this.currentTime = b);
}
},
get _isFinished() {
return !this._idle && (this._playbackRate > 0 && this._currentTime >= this._totalDuration || this._playbackRate < 0 && this._currentTime <= 0);
},
get _totalDuration() {
return this._effect._totalDuration;
},
get playState() {
return this._idle ? 'idle' : null == this._startTime && !this._paused && 0 != this.playbackRate || this._currentTimePending ? 'pending' : this._paused ? 'paused' : this._isFinished ? 'finished' : 'running';
},
play: function () {
this._paused = !1, (this._isFinished || this._idle) && (this._currentTime = this._playbackRate > 0 ? 0 : this._totalDuration, this._startTime = null, b.invalidateEffects()), this._finishedFlag = !1, b.restart(), this._idle = !1, this._ensureAlive();
},
pause: function () {
this._isFinished || this._paused || this._idle || (this._currentTimePending = !0), this._startTime = null, this._paused = !0;
},
finish: function () {
this._idle || (this.currentTime = this._playbackRate > 0 ? this._totalDuration : 0, this._startTime = this._totalDuration - this.currentTime, this._currentTimePending = !1);
},
cancel: function () {
this._inEffect && (this._inEffect = !1, this._idle = !0, this.currentTime = 0, this._startTime = null, this._effect._update(null), b.invalidateEffects(), b.restart());
},
reverse: function () {
this.playbackRate *= -1, this.play();
},
addEventListener: function (a, b) {
'function' == typeof b && 'finish' == a && this._finishHandlers.push(b);
},
removeEventListener: function (a, b) {
if ('finish' == a) {
var c = this._finishHandlers.indexOf(b);
c >= 0 && this._finishHandlers.splice(c, 1);
}
},
_fireEvents: function (a) {
var b = this._isFinished;
if ((b || this._idle) && !this._finishedFlag) {
var d = new c(this, this._currentTime, a), e = this._finishHandlers.concat(this.onfinish ? [this.onfinish] : []);
setTimeout(function () {
e.forEach(function (a) {
a.call(d.target, d);
});
}, 0);
}
this._finishedFlag = b;
},
_tick: function (a) {
return this._idle || this._paused || (null == this._startTime ? this.startTime = a - this._currentTime / this.playbackRate : this._isFinished || this._tickCurrentTime((a - this._startTime) * this.playbackRate)), this._currentTimePending = !1, this._fireEvents(a), !this._idle && (this._inEffect || !this._finishedFlag);
}
};
}(c, d, f), function (a, b) {
function c(a) {
var b = i;
i = [], a < s.currentTime && (a = s.currentTime), g(a), b.forEach(function (b) {
b[1](a);
}), o && g(a), f(), l = void 0;
}
function d(a, b) {
return a._sequenceNumber - b._sequenceNumber;
}
function e() {
this._animations = [], this.currentTime = window.performance && performance.now ? performance.now() : 0;
}
function f() {
p.forEach(function (a) {
a();
}), p.length = 0;
}
function g(a) {
n = !1;
var c = b.timeline;
c.currentTime = a, c._animations.sort(d), m = !1;
var e = c._animations;
c._animations = [];
var f = [], g = [];
e = e.filter(function (b) {
return b._inTimeline = b._tick(a), b._inEffect ? g.push(b._effect) : f.push(b._effect), b._isFinished || b._paused || b._idle || (m = !0), b._inTimeline;
}), p.push.apply(p, f), p.push.apply(p, g), c._animations.push.apply(c._animations, e), o = !1, m && requestAnimationFrame(function () {
});
}
var h = window.requestAnimationFrame, i = [], j = 0;
window.requestAnimationFrame = function (a) {
var b = j++;
return 0 == i.length && h(c), i.push([
b,
a
]), b;
}, window.cancelAnimationFrame = function (a) {
i.forEach(function (b) {
b[0] == a && (b[1] = function () {
});
});
}, e.prototype = {
_play: function (c) {
c._timing = a.normalizeTimingInput(c.timing);
var d = new b.Animation(c);
return d._idle = !1, d._timeline = this, this._animations.push(d), b.restart(), b.invalidateEffects(), d;
}
};
var k, l = void 0, k = function () {
return void 0 == l && (l = window.performance && performance.now ? performance.now() : Date.now()), l;
}, m = !1, n = !1;
b.restart = function () {
return m || (m = !0, requestAnimationFrame(function () {
}), n = !0), n;
};
var o = !1;
b.invalidateEffects = function () {
o = !0;
};
var p = [], q = 1000 / 60, r = window.getComputedStyle;
Object.defineProperty(window, 'getComputedStyle', {
configurable: !0,
enumerable: !0,
value: function () {
if (o) {
var a = k();
a - s.currentTime > 0 && (s.currentTime += q * (Math.floor((a - s.currentTime) / q) + 1)), g(s.currentTime);
}
return f(), r.apply(this, arguments);
}
});
var s = new e();
b.timeline = s;
}(c, d, f), function (a) {
function b(a, b) {
var c = a.exec(b);
return c ? (c = a.ignoreCase ? c[0].toLowerCase() : c[0], [
c,
b.substr(c.length)
]) : void 0;
}
function c(a, b) {
b = b.replace(/^\s*/, '');
var c = a(b);
return c ? [
c[0],
c[1].replace(/^\s*/, '')
] : void 0;
}
function d(a, d, e) {
a = c.bind(null, a);
for (var f = [];;) {
var g = a(e);
if (!g)
return [
f,
e
];
if (f.push(g[0]), e = g[1], g = b(d, e), !g || '' == g[1])
return [
f,
e
];
e = g[1];
}
}
function e(a, b) {
for (var c = 0, d = 0; d < b.length && (!/\s|,/.test(b[d]) || 0 != c); d++)
if ('(' == b[d])
c++;
else if (')' == b[d] && (c--, 0 == c && d++, 0 >= c))
break;
var e = a(b.substr(0, d));
return void 0 == e ? void 0 : [
e,
b.substr(d)
];
}
function f(a, b) {
for (var c = a, d = b; c && d;)
c > d ? c %= d : d %= c;
return c = a * b / (c + d);
}
function g(a) {
return function (b) {
var c = a(b);
return c && (c[0] = void 0), c;
};
}
function h(a, b) {
return function (c) {
var d = a(c);
return d ? d : [
b,
c
];
};
}
function i(b, c) {
for (var d = [], e = 0; e < b.length; e++) {
var f = a.consumeTrimmed(b[e], c);
if (!f || '' == f[0])
return;
void 0 !== f[0] && d.push(f[0]), c = f[1];
}
return '' == c ? d : void 0;
}
function j(a, b, c, d, e) {
for (var g = [], h = [], i = [], j = f(d.length, e.length), k = 0; j > k; k++) {
var l = b(d[k % d.length], e[k % e.length]);
if (!l)
return;
g.push(l[0]), h.push(l[1]), i.push(l[2]);
}
return [
g,
h,
function (b) {
var d = b.map(function (a, b) {
return i[b](a);
}).join(c);
return a ? a(d) : d;
}
];
}
function k(a, b, c) {
for (var d = [], e = [], f = [], g = 0, h = 0; h < c.length; h++)
if ('function' == typeof c[h]) {
var i = c[h](a[g], b[g++]);
d.push(i[0]), e.push(i[1]), f.push(i[2]);
} else
!function (a) {
d.push(!1), e.push(!1), f.push(function () {
return c[a];
});
}(h);
return [
d,
e,
function (a) {
for (var b = '', c = 0; c < a.length; c++)
b += f[c](a[c]);
return b;
}
];
}
a.consumeToken = b, a.consumeTrimmed = c, a.consumeRepeated = d, a.consumeParenthesised = e, a.ignore = g, a.optional = h, a.consumeList = i, a.mergeNestedRepeated = j.bind(null, null), a.mergeWrappedNestedRepeated = j, a.mergeList = k;
}(d), function (a) {
function b(b) {
function c(b) {
var c = a.consumeToken(/^inset/i, b);
if (c)
return d.inset = !0, c;
var c = a.consumeLengthOrPercent(b);
if (c)
return d.lengths.push(c[0]), c;
var c = a.consumeColor(b);
return c ? (d.color = c[0], c) : void 0;
}
var d = {
inset: !1,
lengths: [],
color: null
}, e = a.consumeRepeated(c, /^/, b);
return e && e[0].length ? [
d,
e[1]
] : void 0;
}
function c(c) {
var d = a.consumeRepeated(b, /^,/, c);
return d && '' == d[1] ? d[0] : void 0;
}
function d(b, c) {
for (; b.lengths.length < Math.max(b.lengths.length, c.lengths.length);)
b.lengths.push({ px: 0 });
for (; c.lengths.length < Math.max(b.lengths.length, c.lengths.length);)
c.lengths.push({ px: 0 });
if (b.inset == c.inset && !!b.color == !!c.color) {
for (var d, e = [], f = [
[],
0
], g = [
[],
0
], h = 0; h < b.lengths.length; h++) {
var i = a.mergeDimensions(b.lengths[h], c.lengths[h], 2 == h);
f[0].push(i[0]), g[0].push(i[1]), e.push(i[2]);
}
if (b.color && c.color) {
var j = a.mergeColors(b.color, c.color);
f[1] = j[0], g[1] = j[1], d = j[2];
}
return [
f,
g,
function (a) {
for (var c = b.inset ? 'inset ' : ' ', f = 0; f < e.length; f++)
c += e[f](a[0][f]) + ' ';
return d && (c += d(a[1])), c;
}
];
}
}
function e(b, c, d, e) {
function f(a) {
return {
inset: a,
color: [
0,
0,
0,
0
],
lengths: [
{ px: 0 },
{ px: 0 },
{ px: 0 },
{ px: 0 }
]
};
}
for (var g = [], h = [], i = 0; i < d.length || i < e.length; i++) {
var j = d[i] || f(e[i].inset), k = e[i] || f(d[i].inset);
g.push(j), h.push(k);
}
return a.mergeNestedRepeated(b, c, g, h);
}
var f = e.bind(null, d, ', ');
a.addPropertiesHandler(c, f, [
'box-shadow',
'text-shadow'
]);
}(d), function (a) {
function b(a) {
return a.toFixed(3).replace('.000', '');
}
function c(a, b, c) {
return Math.min(b, Math.max(a, c));
}
function d(a) {
return /^\s*[-+]?(\d*\.)?\d+\s*$/.test(a) ? Number(a) : void 0;
}
function e(a, c) {
return [
a,
c,
b
];
}
function f(a, b) {
return 0 != a ? h(0, 1 / 0)(a, b) : void 0;
}
function g(a, b) {
return [
a,
b,
function (a) {
return Math.round(c(1, 1 / 0, a));
}
];
}
function h(a, d) {
return function (e, f) {
return [
e,
f,
function (e) {
return b(c(a, d, e));
}
];
};
}
function i(a, b) {
return [
a,
b,
Math.round
];
}
a.clamp = c, a.addPropertiesHandler(d, h(0, 1 / 0), [
'border-image-width',
'line-height'
]), a.addPropertiesHandler(d, h(0, 1), [
'opacity',
'shape-image-threshold'
]), a.addPropertiesHandler(d, f, [
'flex-grow',
'flex-shrink'
]), a.addPropertiesHandler(d, g, [
'orphans',
'widows'
]), a.addPropertiesHandler(d, i, ['z-index']), a.parseNumber = d, a.mergeNumbers = e, a.numberToString = b;
}(d, f), function (a) {
function b(a, b) {
return 'visible' == a || 'visible' == b ? [
0,
1,
function (c) {
return 0 >= c ? a : c >= 1 ? b : 'visible';
}
] : void 0;
}
a.addPropertiesHandler(String, b, ['visibility']);
}(d), function (a) {
function b(a) {
a = a.trim(), e.fillStyle = '#000', e.fillStyle = a;
var b = e.fillStyle;
if (e.fillStyle = '#fff', e.fillStyle = a, b == e.fillStyle) {
e.fillRect(0, 0, 1, 1);
var c = e.getImageData(0, 0, 1, 1).data;
e.clearRect(0, 0, 1, 1);
var d = c[3] / 255;
return [
c[0] * d,
c[1] * d,
c[2] * d,
d
];
}
}
function c(b, c) {
return [
b,
c,
function (b) {
function c(a) {
return Math.max(0, Math.min(255, a));
}
if (b[3])
for (var d = 0; 3 > d; d++)
b[d] = Math.round(c(b[d] / b[3]));
return b[3] = a.numberToString(a.clamp(0, 1, b[3])), 'rgba(' + b.join(',') + ')';
}
];
}
var d = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
d.width = d.height = 1;
var e = d.getContext('2d');
a.addPropertiesHandler(b, c, [
'background-color',
'border-bottom-color',
'border-left-color',
'border-right-color',
'border-top-color',
'color',
'outline-color',
'text-decoration-color'
]), a.consumeColor = a.consumeParenthesised.bind(null, b), a.mergeColors = c;
}(d, f), function (a, b) {
function c(a, b) {
if (b = b.trim().toLowerCase(), '0' == b && 'px'.search(a) >= 0)
return { px: 0 };
if (/^[^(]*$|^calc/.test(b)) {
b = b.replace(/calc\(/g, '(');
var c = {};
b = b.replace(a, function (a) {
return c[a] = null, 'U' + a;
});
for (var d = 'U(' + a.source + ')', e = b.replace(/[-+]?(\d*\.)?\d+/g, 'N').replace(new RegExp('N' + d, 'g'), 'D').replace(/\s[+-]\s/g, 'O').replace(/\s/g, ''), f = [
/N\*(D)/g,
/(N|D)[*\/]N/g,
/(N|D)O\1/g,
/\((N|D)\)/g
], g = 0; g < f.length;)
f[g].test(e) ? (e = e.replace(f[g], '$1'), g = 0) : g++;
if ('D' == e) {
for (var h in c) {
var i = eval(b.replace(new RegExp('U' + h, 'g'), '').replace(new RegExp(d, 'g'), '*0'));
if (!isFinite(i))
return;
c[h] = i;
}
return c;
}
}
}
function d(a, b) {
return e(a, b, !0);
}
function e(b, c, d) {
var e, f = [];
for (e in b)
f.push(e);
for (e in c)
f.indexOf(e) < 0 && f.push(e);
return b = f.map(function (a) {
return b[a] || 0;
}), c = f.map(function (a) {
return c[a] || 0;
}), [
b,
c,
function (b) {
var c = b.map(function (c, e) {
return 1 == b.length && d && (c = Math.max(c, 0)), a.numberToString(c) + f[e];
}).join(' + ');
return b.length > 1 ? 'calc(' + c + ')' : c;
}
];
}
var f = 'px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc', g = c.bind(null, new RegExp(f, 'g')), h = c.bind(null, new RegExp(f + '|%', 'g')), i = c.bind(null, /deg|rad|grad|turn/g);
a.parseLength = g, a.parseLengthOrPercent = h, a.consumeLengthOrPercent = a.consumeParenthesised.bind(null, h), a.parseAngle = i, a.mergeDimensions = e;
var j = a.consumeParenthesised.bind(null, g), k = a.consumeRepeated.bind(void 0, j, /^/), l = a.consumeRepeated.bind(void 0, k, /^,/);
a.consumeSizePairList = l;
var m = function (a) {
var b = l(a);
return b && '' == b[1] ? b[0] : void 0;
}, n = a.mergeNestedRepeated.bind(void 0, d, ' '), o = a.mergeNestedRepeated.bind(void 0, n, ',');
a.mergeNonNegativeSizePair = n, a.addPropertiesHandler(m, o, ['background-size']), a.addPropertiesHandler(h, d, [
'border-bottom-width',
'border-image-width',
'border-left-width',
'border-right-width',
'border-top-width',
'flex-basis',
'font-size',
'height',
'line-height',
'max-height',
'max-width',
'outline-width',
'width'
]), a.addPropertiesHandler(h, e, [
'border-bottom-left-radius',
'border-bottom-right-radius',
'border-top-left-radius',
'border-top-right-radius',
'bottom',
'left',
'letter-spacing',
'margin-bottom',
'margin-left',
'margin-right',
'margin-top',
'min-height',
'min-width',
'outline-offset',
'padding-bottom',
'padding-left',
'padding-right',
'padding-top',
'perspective',
'right',
'shape-margin',
'text-indent',
'top',
'vertical-align',
'word-spacing'
]);
}(d, f), function (a) {
function b(b) {
return a.consumeLengthOrPercent(b) || a.consumeToken(/^auto/, b);
}
function c(c) {
var d = a.consumeList([
a.ignore(a.consumeToken.bind(null, /^rect/)),
a.ignore(a.consumeToken.bind(null, /^\(/)),
a.consumeRepeated.bind(null, b, /^,/),
a.ignore(a.consumeToken.bind(null, /^\)/))
], c);
return d && 4 == d[0].length ? d[0] : void 0;
}
function d(b, c) {
return 'auto' == b || 'auto' == c ? [
!0,
!1,
function (d) {
var e = d ? b : c;
if ('auto' == e)
return 'auto';
var f = a.mergeDimensions(e, e);
return f[2](f[0]);
}
] : a.mergeDimensions(b, c);
}
function e(a) {
return 'rect(' + a + ')';
}
var f = a.mergeWrappedNestedRepeated.bind(null, e, d, ', ');
a.parseBox = c, a.mergeBoxes = f, a.addPropertiesHandler(c, f, ['clip']);
}(d, f), function (a) {
function b(a) {
return function (b) {
var c = 0;
return a.map(function (a) {
return a === j ? b[c++] : a;
});
};
}
function c(a) {
return a;
}
function d(b) {
if (b = b.toLowerCase().trim(), 'none' == b)
return [];
for (var c, d = /\s*(\w+)\(([^)]*)\)/g, e = [], f = 0; c = d.exec(b);) {
if (c.index != f)
return;
f = c.index + c[0].length;
var g = c[1], h = m[g];
if (!h)
return;
var i = c[2].split(','), j = h[0];
if (j.length < i.length)
return;
for (var n = [], o = 0; o < j.length; o++) {
var p, q = i[o], r = j[o];
if (p = q ? {
A: function (b) {
return '0' == b.trim() ? l : a.parseAngle(b);
},
N: a.parseNumber,
T: a.parseLengthOrPercent,
L: a.parseLength
}[r.toUpperCase()](q) : {
a: l,
n: n[0],
t: k
}[r], void 0 === p)
return;
n.push(p);
}
if (e.push({
t: g,
d: n
}), d.lastIndex == b.length)
return e;
}
}
function e(a) {
return a.toFixed(6).replace('.000000', '');
}
function f(b, c) {
if (b.decompositionPair !== c) {
b.decompositionPair = c;
var d = a.makeMatrixDecomposition(b);
}
if (c.decompositionPair !== b) {
c.decompositionPair = b;
var f = a.makeMatrixDecomposition(c);
}
return null == d[0] || null == f[0] ? [
[!1],
[!0],
function (a) {
return a ? c[0].d : b[0].d;
}
] : (d[0].push(0), f[0].push(1), [
d,
f,
function (b) {
var c = a.quat(d[0][3], f[0][3], b[5]), g = a.composeMatrix(b[0], b[1], b[2], c, b[4]), h = g.map(e).join(',');
return h;
}
]);
}
function g(a) {
return a.replace(/[xy]/, '');
}
function h(a) {
return a.replace(/(x|y|z|3d)?$/, '3d');
}
function i(b, c) {
var d = a.makeMatrixDecomposition && !0, e = !1;
if (!b.length || !c.length) {
b.length || (e = !0, b = c, c = []);
for (var i = 0; i < b.length; i++) {
var j = b[i].t, k = b[i].d, l = 'scale' == j.substr(0, 5) ? 1 : 0;
c.push({
t: j,
d: k.map(function (a) {
if ('number' == typeof a)
return l;
var b = {};
for (var c in a)
b[c] = l;
return b;
})
});
}
}
var n = function (a, b) {
return 'perspective' == a && 'perspective' == b || ('matrix' == a || 'matrix3d' == a) && ('matrix' == b || 'matrix3d' == b);
}, o = [], p = [], q = [];
if (b.length != c.length) {
if (!d)
return;
var r = f(b, c);
o = [r[0]], p = [r[1]], q = [[
'matrix',
[r[2]]
]];
} else
for (var i = 0; i < b.length; i++) {
var j, s = b[i].t, t = c[i].t, u = b[i].d, v = c[i].d, w = m[s], x = m[t];
if (n(s, t)) {
if (!d)
return;
var r = f([b[i]], [c[i]]);
o.push(r[0]), p.push(r[1]), q.push([
'matrix',
[r[2]]
]);
} else {
if (s == t)
j = s;
else if (w[2] && x[2] && g(s) == g(t))
j = g(s), u = w[2](u), v = x[2](v);
else {
if (!w[1] || !x[1] || h(s) != h(t)) {
if (!d)
return;
var r = f(b, c);
o = [r[0]], p = [r[1]], q = [[
'matrix',
[r[2]]
]];
break;
}
j = h(s), u = w[1](u), v = x[1](v);
}
for (var y = [], z = [], A = [], B = 0; B < u.length; B++) {
var C = 'number' == typeof u[B] ? a.mergeNumbers : a.mergeDimensions, r = C(u[B], v[B]);
y[B] = r[0], z[B] = r[1], A.push(r[2]);
}
o.push(y), p.push(z), q.push([
j,
A
]);
}
}
if (e) {
var D = o;
o = p, p = D;
}
return [
o,
p,
function (a) {
return a.map(function (a, b) {
var c = a.map(function (a, c) {
return q[b][1][c](a);
}).join(',');
return 'matrix' == q[b][0] && 16 == c.split(',').length && (q[b][0] = 'matrix3d'), q[b][0] + '(' + c + ')';
}).join(' ');
}
];
}
var j = null, k = { px: 0 }, l = { deg: 0 }, m = {
matrix: [
'NNNNNN',
[
j,
j,
0,
0,
j,
j,
0,
0,
0,
0,
1,
0,
j,
j,
0,
1
],
c
],
matrix3d: [
'NNNNNNNNNNNNNNNN',
c
],
rotate: ['A'],
rotatex: ['A'],
rotatey: ['A'],
rotatez: ['A'],
rotate3d: ['NNNA'],
perspective: ['L'],
scale: [
'Nn',
b([
j,
j,
1
]),
c
],
scalex: [
'N',
b([
j,
1,
1
]),
b([
j,
1
])
],
scaley: [
'N',
b([
1,
j,
1
]),
b([
1,
j
])
],
scalez: [
'N',
b([
1,
1,
j
])
],
scale3d: [
'NNN',
c
],
skew: [
'Aa',
null,
c
],
skewx: [
'A',
null,
b([
j,
l
])
],
skewy: [
'A',
null,
b([
l,
j
])
],
translate: [
'Tt',
b([
j,
j,
k
]),
c
],
translatex: [
'T',
b([
j,
k,
k
]),
b([
j,
k
])
],
translatey: [
'T',
b([
k,
j,
k
]),
b([
k,
j
])
],
translatez: [
'L',
b([
k,
k,
j
])
],
translate3d: [
'TTL',
c
]
};
a.addPropertiesHandler(d, i, ['transform']);
}(d, f), function (a) {
function b(a, b) {
b.concat([a]).forEach(function (b) {
b in document.documentElement.style && (c[a] = b);
});
}
var c = {};
b('transform', [
'webkitTransform',
'msTransform'
]), b('transformOrigin', ['webkitTransformOrigin']), b('perspective', ['webkitPerspective']), b('perspectiveOrigin', ['webkitPerspectiveOrigin']), a.propertyName = function (a) {
return c[a] || a;
};
}(d, f);
}(), !function (a, b) {
function c(a) {
var b = window.document.timeline;
b.currentTime = a, b._discardAnimations(), 0 == b._animations.length ? e = !1 : requestAnimationFrame(c);
}
var d = window.requestAnimationFrame;
window.requestAnimationFrame = function (a) {
return d(function (b) {
window.document.timeline._updateAnimationsPromises(), a(b), window.document.timeline._updateAnimationsPromises();
});
}, b.AnimationTimeline = function () {
this._animations = [], this.currentTime = void 0;
}, b.AnimationTimeline.prototype = {
getAnimations: function () {
return this._discardAnimations(), this._animations.slice();
},
_updateAnimationsPromises: function () {
b.animationsWithPromises = b.animationsWithPromises.filter(function (a) {
return a._updatePromises();
});
},
_discardAnimations: function () {
this._updateAnimationsPromises(), this._animations = this._animations.filter(function (a) {
return 'finished' != a.playState && 'idle' != a.playState;
});
},
_play: function (a) {
var c = new b.Animation(a, this);
return this._animations.push(c), b.restartWebAnimationsNextTick(), c._updatePromises(), c._animation.play(), c._updatePromises(), c;
},
play: function (a) {
return a && a.remove(), this._play(a);
}
};
var e = !1;
b.restartWebAnimationsNextTick = function () {
e || (e = !0, requestAnimationFrame(c));
};
var f = new b.AnimationTimeline();
b.timeline = f;
try {
Object.defineProperty(window.document, 'timeline', {
configurable: !0,
get: function () {
return f;
}
});
} catch (g) {
}
try {
window.document.timeline = f;
} catch (g) {
}
}(c, e, f), function (a, b) {
b.animationsWithPromises = [], b.Animation = function (b, c) {
if (this.effect = b, b && (b._animation = this), !c)
throw new Error('Animation with null timeline is not supported');
this._timeline = c, this._sequenceNumber = a.sequenceNumber++, this._holdTime = 0, this._paused = !1, this._isGroup = !1, this._animation = null, this._childAnimations = [], this._callback = null, this._oldPlayState = 'idle', this._rebuildUnderlyingAnimation(), this._animation.cancel(), this._updatePromises();
}, b.Animation.prototype = {
_updatePromises: function () {
var a = this._oldPlayState, b = this.playState;
return this._readyPromise && b !== a && ('idle' == b ? (this._rejectReadyPromise(), this._readyPromise = void 0) : 'pending' == a ? this._resolveReadyPromise() : 'pending' == b && (this._readyPromise = void 0)), this._finishedPromise && b !== a && ('idle' == b ? (this._rejectFinishedPromise(), this._finishedPromise = void 0) : 'finished' == b ? this._resolveFinishedPromise() : 'finished' == a && (this._finishedPromise = void 0)), this._oldPlayState = this.playState, this._readyPromise || this._finishedPromise;
},
_rebuildUnderlyingAnimation: function () {
this._updatePromises();
var a, c, d, e, f = this._animation ? !0 : !1;
f && (a = this.playbackRate, c = this._paused, d = this.startTime, e = this.currentTime, this._animation.cancel(), this._animation._wrapper = null, this._animation = null), (!this.effect || this.effect instanceof window.KeyframeEffect) && (this._animation = b.newUnderlyingAnimationForKeyframeEffect(this.effect), b.bindAnimationForKeyframeEffect(this)), (this.effect instanceof window.SequenceEffect || this.effect instanceof window.GroupEffect) && (this._animation = b.newUnderlyingAnimationForGroup(this.effect), b.bindAnimationForGroup(this)), this.effect && this.effect._onsample && b.bindAnimationForCustomEffect(this), f && (1 != a && (this.playbackRate = a), null !== d ? this.startTime = d : null !== e ? this.currentTime = e : null !== this._holdTime && (this.currentTime = this._holdTime), c && this.pause()), this._updatePromises();
},
_updateChildren: function () {
if (this.effect && 'idle' != this.playState) {
var a = this.effect._timing.delay;
this._childAnimations.forEach(function (c) {
this._arrangeChildren(c, a), this.effect instanceof window.SequenceEffect && (a += b.groupChildDuration(c.effect));
}.bind(this));
}
},
_setExternalAnimation: function (a) {
if (this.effect && this._isGroup)
for (var b = 0; b < this.effect.children.length; b++)
this.effect.children[b]._animation = a, this._childAnimations[b]._setExternalAnimation(a);
},
_constructChildAnimations: function () {
if (this.effect && this._isGroup) {
var a = this.effect._timing.delay;
this._removeChildAnimations(), this.effect.children.forEach(function (c) {
var d = window.document.timeline._play(c);
this._childAnimations.push(d), d.playbackRate = this.playbackRate, this._paused && d.pause(), c._animation = this.effect._animation, this._arrangeChildren(d, a), this.effect instanceof window.SequenceEffect && (a += b.groupChildDuration(c));
}.bind(this));
}
},
_arrangeChildren: function (a, b) {
null === this.startTime ? a.currentTime = this.currentTime - b / this.playbackRate : a.startTime !== this.startTime + b / this.playbackRate && (a.startTime = this.startTime + b / this.playbackRate);
},
get timeline() {
return this._timeline;
},
get playState() {
return this._animation ? this._animation.playState : 'idle';
},
get finished() {
return window.Promise ? (this._finishedPromise || (-1 == b.animationsWithPromises.indexOf(this) && b.animationsWithPromises.push(this), this._finishedPromise = new Promise(function (a, b) {
this._resolveFinishedPromise = function () {
a(this);
}, this._rejectFinishedPromise = function () {
b({
type: DOMException.ABORT_ERR,
name: 'AbortError'
});
};
}.bind(this)), 'finished' == this.playState && this._resolveFinishedPromise()), this._finishedPromise) : (console.warn('Animation Promises require JavaScript Promise constructor'), null);
},
get ready() {
return window.Promise ? (this._readyPromise || (-1 == b.animationsWithPromises.indexOf(this) && b.animationsWithPromises.push(this), this._readyPromise = new Promise(function (a, b) {
this._resolveReadyPromise = function () {
a(this);
}, this._rejectReadyPromise = function () {
b({
type: DOMException.ABORT_ERR,
name: 'AbortError'
});
};
}.bind(this)), 'pending' !== this.playState && this._resolveReadyPromise()), this._readyPromise) : (console.warn('Animation Promises require JavaScript Promise constructor'), null);
},
get onfinish() {
return this._onfinish;
},
set onfinish(a) {
'function' == typeof a ? (this._onfinish = a, this._animation.onfinish = function (b) {
b.target = this, a.call(this, b);
}.bind(this)) : (this._animation.onfinish = a, this.onfinish = this._animation.onfinish);
},
get currentTime() {
this._updatePromises();
var a = this._animation.currentTime;
return this._updatePromises(), a;
},
set currentTime(a) {
this._updatePromises(), this._animation.currentTime = isFinite(a) ? a : Math.sign(a) * Number.MAX_VALUE, this._register(), this._forEachChild(function (b, c) {
b.currentTime = a - c;
}), this._updatePromises();
},
get startTime() {
return this._animation.startTime;
},
set startTime(a) {
this._updatePromises(), this._animation.startTime = isFinite(a) ? a : Math.sign(a) * Number.MAX_VALUE, this._register(), this._forEachChild(function (b, c) {
b.startTime = a + c;
}), this._updatePromises();
},
get playbackRate() {
return this._animation.playbackRate;
},
set playbackRate(a) {
this._updatePromises();
var b = this.currentTime;
this._animation.playbackRate = a, this._forEachChild(function (b) {
b.playbackRate = a;
}), 'paused' != this.playState && 'idle' != this.playState && this.play(), null !== b && (this.currentTime = b), this._updatePromises();
},
play: function () {
this._updatePromises(), this._paused = !1, this._animation.play(), -1 == this._timeline._animations.indexOf(this) && this._timeline._animations.push(this), this._register(), b.awaitStartTime(this), this._forEachChild(function (a) {
var b = a.currentTime;
a.play(), a.currentTime = b;
}), this._updatePromises();
},
pause: function () {
this._updatePromises(), this.currentTime && (this._holdTime = this.currentTime), this._animation.pause(), this._register(), this._forEachChild(function (a) {
a.pause();
}), this._paused = !0, this._updatePromises();
},
finish: function () {
this._updatePromises(), this._animation.finish(), this._register(), this._updatePromises();
},
cancel: function () {
this._updatePromises(), this._animation.cancel(), this._register(), this._removeChildAnimations(), this._updatePromises();
},
reverse: function () {
this._updatePromises();
var a = this.currentTime;
this._animation.reverse(), this._forEachChild(function (a) {
a.reverse();
}), null !== a && (this.currentTime = a), this._updatePromises();
},
addEventListener: function (a, b) {
var c = b;
'function' == typeof b && (c = function (a) {
a.target = this, b.call(this, a);
}.bind(this), b._wrapper = c), this._animation.addEventListener(a, c);
},
removeEventListener: function (a, b) {
this._animation.removeEventListener(a, b && b._wrapper || b);
},
_removeChildAnimations: function () {
for (; this._childAnimations.length;)
this._childAnimations.pop().cancel();
},
_forEachChild: function (b) {
var c = 0;
if (this.effect.children && this._childAnimations.length < this.effect.children.length && this._constructChildAnimations(), this._childAnimations.forEach(function (a) {
b.call(this, a, c), this.effect instanceof window.SequenceEffect && (c += a.effect.activeDuration);
}.bind(this)), 'pending' != this.playState) {
var d = this.effect._timing, e = this.currentTime;
null !== e && (e = a.calculateTimeFraction(a.calculateActiveDuration(d), e, d)), (null == e || isNaN(e)) && this._removeChildAnimations();
}
}
}, window.Animation = b.Animation;
}(c, e, f), function (a, b) {
function c(b) {
this._frames = a.normalizeKeyframes(b);
}
function d() {
for (var a = !1; h.length;) {
var b = h.shift();
b._updateChildren(), a = !0;
}
return a;
}
var e = function (a) {
if (a._animation = void 0, a instanceof window.SequenceEffect || a instanceof window.GroupEffect)
for (var b = 0; b < a.children.length; b++)
e(a.children[b]);
};
b.removeMulti = function (a) {
for (var b = [], c = 0; c < a.length; c++) {
var d = a[c];
d._parent ? (-1 == b.indexOf(d._parent) && b.push(d._parent), d._parent.children.splice(d._parent.children.indexOf(d), 1), d._parent = null, e(d)) : d._animation && d._animation.effect == d && (d._animation.cancel(), d._animation.effect = new KeyframeEffect(null, []), d._animation._callback && (d._animation._callback._animation = null), d._animation._rebuildUnderlyingAnimation(), e(d));
}
for (c = 0; c < b.length; c++)
b[c]._rebuild();
}, b.KeyframeEffect = function (b, d, e) {
return this.target = b, this._parent = null, e = a.numericTimingToObject(e), this._timingInput = a.cloneTimingInput(e), this._timing = a.normalizeTimingInput(e), this.timing = a.makeTiming(e, !1, this), this.timing._effect = this, 'function' == typeof d ? (a.deprecated('Custom KeyframeEffect', '2015-06-22', 'Use KeyframeEffect.onsample instead.'), this._normalizedKeyframes = d) : this._normalizedKeyframes = new c(d), this._keyframes = d, this.activeDuration = a.calculateActiveDuration(this._timing), this;
}, b.KeyframeEffect.prototype = {
getFrames: function () {
return 'function' == typeof this._normalizedKeyframes ? this._normalizedKeyframes : this._normalizedKeyframes._frames;
},
set onsample(a) {
if ('function' == typeof this.getFrames())
throw new Error('Setting onsample on custom effect KeyframeEffect is not supported.');
this._onsample = a, this._animation && this._animation._rebuildUnderlyingAnimation();
},
get parent() {
return this._parent;
},
clone: function () {
if ('function' == typeof this.getFrames())
throw new Error('Cloning custom effects is not supported.');
var b = new KeyframeEffect(this.target, [], a.cloneTimingInput(this._timingInput));
return b._normalizedKeyframes = this._normalizedKeyframes, b._keyframes = this._keyframes, b;
},
remove: function () {
b.removeMulti([this]);
}
};
var f = Element.prototype.animate;
Element.prototype.animate = function (a, c) {
return b.timeline._play(new b.KeyframeEffect(this, a, c));
};
var g = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
b.newUnderlyingAnimationForKeyframeEffect = function (a) {
if (a) {
var b = a.target || g, c = a._keyframes;
'function' == typeof c && (c = []);
var d = a._timingInput;
} else
var b = g, c = [], d = 0;
return f.apply(b, [
c,
d
]);
}, b.bindAnimationForKeyframeEffect = function (a) {
a.effect && 'function' == typeof a.effect._normalizedKeyframes && b.bindAnimationForCustomEffect(a);
};
var h = [];
b.awaitStartTime = function (a) {
null === a.startTime && a._isGroup && (0 == h.length && requestAnimationFrame(d), h.push(a));
};
var i = window.getComputedStyle;
Object.defineProperty(window, 'getComputedStyle', {
configurable: !0,
enumerable: !0,
value: function () {
window.document.timeline._updateAnimationsPromises();
var a = i.apply(this, arguments);
return d() && (a = i.apply(this, arguments)), window.document.timeline._updateAnimationsPromises(), a;
}
}), window.KeyframeEffect = b.KeyframeEffect, window.Element.prototype.getAnimations = function () {
return document.timeline.getAnimations().filter(function (a) {
return null !== a.effect && a.effect.target == this;
}.bind(this));
};
}(c, e, f), function (a, b) {
function c(a) {
a._registered || (a._registered = !0, f.push(a), g || (g = !0, requestAnimationFrame(d)));
}
function d() {
var a = f;
f = [], a.sort(function (a, b) {
return a._sequenceNumber - b._sequenceNumber;
}), a = a.filter(function (a) {
a();
var b = a._animation ? a._animation.playState : 'idle';
return 'running' != b && 'pending' != b && (a._registered = !1), a._registered;
}), f.push.apply(f, a), f.length ? (g = !0, requestAnimationFrame(d)) : g = !1;
}
var e = (document.createElementNS('http://www.w3.org/1999/xhtml', 'div'), 0);
b.bindAnimationForCustomEffect = function (b) {
var d, f = b.effect.target, g = 'function' == typeof b.effect.getFrames();
d = g ? b.effect.getFrames() : b.effect._onsample;
var h = b.effect.timing, i = null;
h = a.normalizeTimingInput(h);
var j = function () {
var c = j._animation ? j._animation.currentTime : null;
null !== c && (c = a.calculateTimeFraction(a.calculateActiveDuration(h), c, h), isNaN(c) && (c = null)), c !== i && (g ? d(c, f, b.effect) : d(c, b.effect, b.effect._animation)), i = c;
};
j._animation = b, j._registered = !1, j._sequenceNumber = e++, b._callback = j, c(j);
};
var f = [], g = !1;
b.Animation.prototype._register = function () {
this._callback && c(this._callback);
};
}(c, e, f), function (a, b) {
function c(a) {
return a._timing.delay + a.activeDuration + a._timing.endDelay;
}
function d(b, c) {
this._parent = null, this.children = b || [], this._reparent(this.children), c = a.numericTimingToObject(c), this._timingInput = a.cloneTimingInput(c), this._timing = a.normalizeTimingInput(c, !0), this.timing = a.makeTiming(c, !0, this), this.timing._effect = this, 'auto' === this._timing.duration && (this._timing.duration = this.activeDuration);
}
window.SequenceEffect = function () {
d.apply(this, arguments);
}, window.GroupEffect = function () {
d.apply(this, arguments);
}, d.prototype = {
_isAncestor: function (a) {
for (var b = this; null !== b;) {
if (b == a)
return !0;
b = b._parent;
}
return !1;
},
_rebuild: function () {
for (var a = this; a;)
'auto' === a.timing.duration && (a._timing.duration = a.activeDuration), a = a._parent;
this._animation && this._animation._rebuildUnderlyingAnimation();
},
_reparent: function (a) {
b.removeMulti(a);
for (var c = 0; c < a.length; c++)
a[c]._parent = this;
},
_putChild: function (a, b) {
for (var c = b ? 'Cannot append an ancestor or self' : 'Cannot prepend an ancestor or self', d = 0; d < a.length; d++)
if (this._isAncestor(a[d]))
throw {
type: DOMException.HIERARCHY_REQUEST_ERR,
name: 'HierarchyRequestError',
message: c
};
for (var d = 0; d < a.length; d++)
b ? this.children.push(a[d]) : this.children.unshift(a[d]);
this._reparent(a), this._rebuild();
},
append: function () {
this._putChild(arguments, !0);
},
prepend: function () {
this._putChild(arguments, !1);
},
get parent() {
return this._parent;
},
get firstChild() {
return this.children.length ? this.children[0] : null;
},
get lastChild() {
return this.children.length ? this.children[this.children.length - 1] : null;
},
clone: function () {
for (var b = a.cloneTimingInput(this._timingInput), c = [], d = 0; d < this.children.length; d++)
c.push(this.children[d].clone());
return this instanceof GroupEffect ? new GroupEffect(c, b) : new SequenceEffect(c, b);
},
remove: function () {
b.removeMulti([this]);
}
}, window.SequenceEffect.prototype = Object.create(d.prototype), Object.defineProperty(window.SequenceEffect.prototype, 'activeDuration', {
get: function () {
var a = 0;
return this.children.forEach(function (b) {
a += c(b);
}), Math.max(a, 0);
}
}), window.GroupEffect.prototype = Object.create(d.prototype), Object.defineProperty(window.GroupEffect.prototype, 'activeDuration', {
get: function () {
var a = 0;
return this.children.forEach(function (b) {
a = Math.max(a, c(b));
}), a;
}
}), b.newUnderlyingAnimationForGroup = function (c) {
var d, e = null, f = function (b) {
var c = d._wrapper;
return c && 'pending' != c.playState && c.effect ? null == b ? void c._removeChildAnimations() : 0 == b && c.playbackRate < 0 && (e || (e = a.normalizeTimingInput(c.effect.timing)), b = a.calculateTimeFraction(a.calculateActiveDuration(e), -1, e), isNaN(b) || null == b) ? (c._forEachChild(function (a) {
a.currentTime = -1;
}), void c._removeChildAnimations()) : void 0 : void 0;
}, g = new KeyframeEffect(null, [], c._timing);
return g.onsample = f, d = b.timeline._play(g);
}, b.bindAnimationForGroup = function (a) {
a._animation._wrapper = a, a._isGroup = !0, b.awaitStartTime(a), a._constructChildAnimations(), a._setExternalAnimation(a);
}, b.groupChildDuration = c;
}(c, e, f);
}({}, function () {
return this;
}());
Polymer({
is: 'opaque-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
node.style.opacity = '0';
this._effect = new KeyframeEffect(node, [
{ 'opacity': '1' },
{ 'opacity': '1' }
], this.timingFromConfig(config));
return this._effect;
},
complete: function (config) {
config.node.style.opacity = '';
}
});
Polymer.NeonAnimatableBehavior = {
properties: {
animationConfig: { type: Object },
entryAnimation: {
observer: '_entryAnimationChanged',
type: String
},
exitAnimation: {
observer: '_exitAnimationChanged',
type: String
}
},
_entryAnimationChanged: function () {
this.animationConfig = this.animationConfig || {};
if (this.entryAnimation !== 'fade-in-animation') {
this.animationConfig['entry'] = [
{
name: 'opaque-animation',
node: this
},
{
name: this.entryAnimation,
node: this
}
];
} else {
this.animationConfig['entry'] = [{
name: this.entryAnimation,
node: this
}];
}
},
_exitAnimationChanged: function () {
this.animationConfig = this.animationConfig || {};
this.animationConfig['exit'] = [{
name: this.exitAnimation,
node: this
}];
},
_copyProperties: function (config1, config2) {
for (var property in config2) {
config1[property] = config2[property];
}
},
_cloneConfig: function (config) {
var clone = { isClone: true };
this._copyProperties(clone, config);
return clone;
},
_getAnimationConfigRecursive: function (type, map, allConfigs) {
if (!this.animationConfig) {
return;
}
if (this.animationConfig.value && typeof this.animationConfig.value === 'function') {
this._warn(this._logf('playAnimation', 'Please put \'animationConfig\' inside of your components \'properties\' object instead of outside of it.'));
return;
}
var thisConfig;
if (type) {
thisConfig = this.animationConfig[type];
} else {
thisConfig = this.animationConfig;
}
if (!Array.isArray(thisConfig)) {
thisConfig = [thisConfig];
}
if (thisConfig) {
for (var config, index = 0; config = thisConfig[index]; index++) {
if (config.animatable) {
config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
} else {
if (config.id) {
var cachedConfig = map[config.id];
if (cachedConfig) {
if (!cachedConfig.isClone) {
map[config.id] = this._cloneConfig(cachedConfig);
cachedConfig = map[config.id];
}
this._copyProperties(cachedConfig, config);
} else {
map[config.id] = config;
}
} else {
allConfigs.push(config);
}
}
}
}
},
getAnimationConfig: function (type) {
var map = {};
var allConfigs = [];
this._getAnimationConfigRecursive(type, map, allConfigs);
for (var key in map) {
allConfigs.push(map[key]);
}
return allConfigs;
}
};
Polymer.NeonAnimationRunnerBehaviorImpl = {
properties: { _player: { type: Object } },
_configureAnimationEffects: function (allConfigs) {
var allAnimations = [];
if (allConfigs.length > 0) {
for (var config, index = 0; config = allConfigs[index]; index++) {
var animation = document.createElement(config.name);
if (animation.isNeonAnimation) {
var effect = animation.configure(config);
if (effect) {
allAnimations.push({
animation: animation,
config: config,
effect: effect
});
}
} else {
console.warn(this.is + ':', config.name, 'not found!');
}
}
}
return allAnimations;
},
_runAnimationEffects: function (allEffects) {
return document.timeline.play(new GroupEffect(allEffects));
},
_completeAnimations: function (allAnimations) {
for (var animation, index = 0; animation = allAnimations[index]; index++) {
animation.animation.complete(animation.config);
}
},
playAnimation: function (type, cookie) {
var allConfigs = this.getAnimationConfig(type);
if (!allConfigs) {
return;
}
var allAnimations = this._configureAnimationEffects(allConfigs);
var allEffects = allAnimations.map(function (animation) {
return animation.effect;
});
if (allEffects.length > 0) {
this._player = this._runAnimationEffects(allEffects);
this._player.onfinish = function () {
this._completeAnimations(allAnimations);
if (this._player) {
this._player.cancel();
this._player = null;
}
this.fire('neon-animation-finish', cookie, { bubbles: false });
}.bind(this);
} else {
this.fire('neon-animation-finish', cookie, { bubbles: false });
}
},
cancelAnimation: function () {
if (this._player) {
this._player.cancel();
}
}
};
Polymer.NeonAnimationRunnerBehavior = [
Polymer.NeonAnimatableBehavior,
Polymer.NeonAnimationRunnerBehaviorImpl
];
(function () {
'use strict';
Polymer.IronDropdownScrollManager = {
get currentLockingElement() {
return this._lockingElements[this._lockingElements.length - 1];
},
elementIsScrollLocked: function (element) {
var currentLockingElement = this.currentLockingElement;
if (currentLockingElement === undefined)
return false;
var scrollLocked;
if (this._hasCachedLockedElement(element)) {
return true;
}
if (this._hasCachedUnlockedElement(element)) {
return false;
}
scrollLocked = !!currentLockingElement && currentLockingElement !== element && !this._composedTreeContains(currentLockingElement, element);
if (scrollLocked) {
this._lockedElementCache.push(element);
} else {
this._unlockedElementCache.push(element);
}
return scrollLocked;
},
pushScrollLock: function (element) {
if (this._lockingElements.indexOf(element) >= 0) {
return;
}
if (this._lockingElements.length === 0) {
this._lockScrollInteractions();
}
this._lockingElements.push(element);
this._lockedElementCache = [];
this._unlockedElementCache = [];
},
removeScrollLock: function (element) {
var index = this._lockingElements.indexOf(element);
if (index === -1) {
return;
}
this._lockingElements.splice(index, 1);
this._lockedElementCache = [];
this._unlockedElementCache = [];
if (this._lockingElements.length === 0) {
this._unlockScrollInteractions();
}
},
_lockingElements: [],
_lockedElementCache: null,
_unlockedElementCache: null,
_originalBodyStyles: {},
_isScrollingKeypress: function (event) {
return Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'pageup pagedown home end up left down right');
},
_hasCachedLockedElement: function (element) {
return this._lockedElementCache.indexOf(element) > -1;
},
_hasCachedUnlockedElement: function (element) {
return this._unlockedElementCache.indexOf(element) > -1;
},
_composedTreeContains: function (element, child) {
var contentElements;
var distributedNodes;
var contentIndex;
var nodeIndex;
if (element.contains(child)) {
return true;
}
contentElements = Polymer.dom(element).querySelectorAll('content');
for (contentIndex = 0; contentIndex < contentElements.length; ++contentIndex) {
distributedNodes = Polymer.dom(contentElements[contentIndex]).getDistributedNodes();
for (nodeIndex = 0; nodeIndex < distributedNodes.length; ++nodeIndex) {
if (this._composedTreeContains(distributedNodes[nodeIndex], child)) {
return true;
}
}
}
return false;
},
_scrollInteractionHandler: function (event) {
var scrolledElement = Polymer.dom(event).rootTarget;
if (Polymer.IronDropdownScrollManager.elementIsScrollLocked(scrolledElement)) {
if (event.type === 'keydown' && !Polymer.IronDropdownScrollManager._isScrollingKeypress(event)) {
return;
}
event.preventDefault();
}
},
_lockScrollInteractions: function () {
this._originalBodyStyles.overflow = document.body.style.overflow;
this._originalBodyStyles.overflowX = document.body.style.overflowX;
this._originalBodyStyles.overflowY = document.body.style.overflowY;
document.body.style.overflow = 'hidden';
document.body.style.overflowX = 'hidden';
document.body.style.overflowY = 'hidden';
document.addEventListener('wheel', this._scrollInteractionHandler, true);
document.addEventListener('mousewheel', this._scrollInteractionHandler, true);
document.addEventListener('DOMMouseScroll', this._scrollInteractionHandler, true);
document.addEventListener('touchmove', this._scrollInteractionHandler, true);
document.addEventListener('keydown', this._scrollInteractionHandler, true);
},
_unlockScrollInteractions: function () {
document.body.style.overflow = this._originalBodyStyles.overflow;
document.body.style.overflowX = this._originalBodyStyles.overflowX;
document.body.style.overflowY = this._originalBodyStyles.overflowY;
document.removeEventListener('wheel', this._scrollInteractionHandler, true);
document.removeEventListener('mousewheel', this._scrollInteractionHandler, true);
document.removeEventListener('DOMMouseScroll', this._scrollInteractionHandler, true);
document.removeEventListener('touchmove', this._scrollInteractionHandler, true);
document.removeEventListener('keydown', this._scrollInteractionHandler, true);
}
};
}());
(function () {
'use strict';
Polymer({
is: 'iron-dropdown',
behaviors: [
Polymer.IronControlState,
Polymer.IronA11yKeysBehavior,
Polymer.IronOverlayBehavior,
Polymer.NeonAnimationRunnerBehavior
],
properties: {
horizontalAlign: {
type: String,
value: 'left',
reflectToAttribute: true
},
verticalAlign: {
type: String,
value: 'top',
reflectToAttribute: true
},
horizontalOffset: {
type: Number,
value: 0,
notify: true
},
verticalOffset: {
type: Number,
value: 0,
notify: true
},
positionTarget: { type: Object },
openAnimationConfig: { type: Object },
closeAnimationConfig: { type: Object },
focusTarget: { type: Object },
noAnimations: {
type: Boolean,
value: false
},
allowOutsideScroll: {
type: Boolean,
value: false
}
},
listeners: { 'neon-animation-finish': '_onNeonAnimationFinish' },
observers: ['_updateOverlayPosition(positionTarget, verticalAlign, horizontalAlign, verticalOffset, horizontalOffset)'],
attached: function () {
this.positionTarget = this.positionTarget || this._defaultPositionTarget;
this._isRTL = window.getComputedStyle(this).direction == 'rtl';
},
get containedElement() {
return Polymer.dom(this.$.content).getDistributedNodes()[0];
},
get _focusTarget() {
return this.focusTarget || this.containedElement;
},
get _defaultPositionTarget() {
var parent = Polymer.dom(this).parentNode;
if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
parent = parent.host;
}
return parent;
},
get _localeHorizontalAlign() {
if (this._isRTL) {
return this.horizontalAlign === 'right' ? 'left' : 'right';
} else {
return this.horizontalAlign;
}
},
_horizontalAlignTargetValue: function (dropdownRect, positionRect, fromRight) {
var target;
if (fromRight) {
target = document.documentElement.clientWidth - positionRect.right - (this._fitWidth - dropdownRect.right);
} else {
target = positionRect.left - dropdownRect.left;
}
target += this.horizontalOffset;
return Math.max(target, 0);
},
_verticalAlignTargetValue: function (dropdownRect, positionRect, fromBottom) {
var target;
if (fromBottom) {
target = document.documentElement.clientHeight - positionRect.bottom - (this._fitHeight - dropdownRect.bottom);
} else {
target = positionRect.top - dropdownRect.top;
}
target += this.verticalOffset;
return Math.max(target, 0);
},
_openedChanged: function (opened) {
if (opened && this.disabled) {
this.cancel();
} else {
this.cancelAnimation();
this.sizingTarget = this.containedElement || this.sizingTarget;
this._updateAnimationConfig();
Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
}
},
_renderOpened: function () {
if (!this.allowOutsideScroll) {
Polymer.IronDropdownScrollManager.pushScrollLock(this);
}
if (!this.noAnimations && this.animationConfig && this.animationConfig.open) {
if (this.withBackdrop) {
this.backdropElement.open();
}
this.$.contentWrapper.classList.add('animating');
this.playAnimation('open');
} else {
Polymer.IronOverlayBehaviorImpl._renderOpened.apply(this, arguments);
}
},
_renderClosed: function () {
Polymer.IronDropdownScrollManager.removeScrollLock(this);
if (!this.noAnimations && this.animationConfig && this.animationConfig.close) {
if (this.withBackdrop) {
this.backdropElement.close();
}
this.$.contentWrapper.classList.add('animating');
this.playAnimation('close');
} else {
Polymer.IronOverlayBehaviorImpl._renderClosed.apply(this, arguments);
}
},
_onNeonAnimationFinish: function () {
this.$.contentWrapper.classList.remove('animating');
if (this.opened) {
Polymer.IronOverlayBehaviorImpl._finishRenderOpened.apply(this);
} else {
Polymer.IronOverlayBehaviorImpl._finishRenderClosed.apply(this);
}
},
_updateAnimationConfig: function () {
var animationConfig = {};
var animations = [];
if (this.openAnimationConfig) {
animationConfig.open = [{ name: 'opaque-animation' }].concat(this.openAnimationConfig);
animations = animations.concat(animationConfig.open);
}
if (this.closeAnimationConfig) {
animationConfig.close = this.closeAnimationConfig;
animations = animations.concat(animationConfig.close);
}
animations.forEach(function (animation) {
animation.node = this.containedElement;
}, this);
this.animationConfig = animationConfig;
},
_updateOverlayPosition: function () {
if (this.isAttached) {
this.notifyResize();
}
},
refit: function () {
if (!this.opened) {
return;
}
var containedElement = this.containedElement;
var scrollTop;
var scrollLeft;
if (containedElement) {
scrollTop = containedElement.scrollTop;
scrollLeft = containedElement.scrollLeft;
}
Polymer.IronFitBehavior.refit.apply(this, arguments);
if (containedElement) {
containedElement.scrollTop = scrollTop;
containedElement.scrollLeft = scrollLeft;
}
},
resetFit: function () {
Polymer.IronFitBehavior.resetFit.apply(this, arguments);
var hAlign = this._localeHorizontalAlign;
var vAlign = this.verticalAlign;
this.style[hAlign] = this.style[vAlign] = '0px';
var dropdownRect = this.getBoundingClientRect();
var positionRect = this.positionTarget.getBoundingClientRect();
var horizontalValue = this._horizontalAlignTargetValue(dropdownRect, positionRect, hAlign === 'right');
var verticalValue = this._verticalAlignTargetValue(dropdownRect, positionRect, vAlign === 'bottom');
this.style[hAlign] = horizontalValue + 'px';
this.style[vAlign] = verticalValue + 'px';
},
_discoverInfo: function () {
Polymer.IronFitBehavior._discoverInfo.apply(this, arguments);
this._fitInfo.positionedBy.horizontally = this._localeHorizontalAlign;
this._fitInfo.positionedBy.vertically = this.verticalAlign;
},
_applyFocus: function () {
var focusTarget = this.focusTarget || this.containedElement;
if (focusTarget && this.opened && !this.noAutoFocus) {
focusTarget.focus();
} else {
Polymer.IronOverlayBehaviorImpl._applyFocus.apply(this, arguments);
}
}
});
}());
Polymer({
is: 'fade-in-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
this._effect = new KeyframeEffect(node, [
{ 'opacity': '0' },
{ 'opacity': '1' }
], this.timingFromConfig(config));
return this._effect;
}
});
Polymer({
is: 'fade-out-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
this._effect = new KeyframeEffect(node, [
{ 'opacity': '1' },
{ 'opacity': '0' }
], this.timingFromConfig(config));
return this._effect;
}
});
Polymer({
is: 'paper-menu-grow-height-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
var rect = node.getBoundingClientRect();
var height = rect.height;
this._effect = new KeyframeEffect(node, [
{ height: height / 2 + 'px' },
{ height: height + 'px' }
], this.timingFromConfig(config));
return this._effect;
}
});
Polymer({
is: 'paper-menu-grow-width-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
var rect = node.getBoundingClientRect();
var width = rect.width;
this._effect = new KeyframeEffect(node, [
{ width: width / 2 + 'px' },
{ width: width + 'px' }
], this.timingFromConfig(config));
return this._effect;
}
});
Polymer({
is: 'paper-menu-shrink-width-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
var rect = node.getBoundingClientRect();
var width = rect.width;
this._effect = new KeyframeEffect(node, [
{ width: width + 'px' },
{ width: width - width / 20 + 'px' }
], this.timingFromConfig(config));
return this._effect;
}
});
Polymer({
is: 'paper-menu-shrink-height-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
var rect = node.getBoundingClientRect();
var height = rect.height;
var top = rect.top;
this.setPrefixedProperty(node, 'transformOrigin', '0 0');
this._effect = new KeyframeEffect(node, [
{
height: height + 'px',
transform: 'translateY(0)'
},
{
height: height / 2 + 'px',
transform: 'translateY(-20px)'
}
], this.timingFromConfig(config));
return this._effect;
}
});
(function () {
'use strict';
var PaperMenuButton = Polymer({
is: 'paper-menu-button',
behaviors: [
Polymer.IronA11yKeysBehavior,
Polymer.IronControlState
],
properties: {
opened: {
type: Boolean,
value: false,
notify: true,
observer: '_openedChanged'
},
horizontalAlign: {
type: String,
value: 'left',
reflectToAttribute: true
},
verticalAlign: {
type: String,
value: 'top',
reflectToAttribute: true
},
horizontalOffset: {
type: Number,
value: 0,
notify: true
},
verticalOffset: {
type: Number,
value: 0,
notify: true
},
noAnimations: {
type: Boolean,
value: false
},
ignoreSelect: {
type: Boolean,
value: false
},
openAnimationConfig: {
type: Object,
value: function () {
return [
{
name: 'fade-in-animation',
timing: {
delay: 100,
duration: 200
}
},
{
name: 'paper-menu-grow-width-animation',
timing: {
delay: 100,
duration: 150,
easing: PaperMenuButton.ANIMATION_CUBIC_BEZIER
}
},
{
name: 'paper-menu-grow-height-animation',
timing: {
delay: 100,
duration: 275,
easing: PaperMenuButton.ANIMATION_CUBIC_BEZIER
}
}
];
}
},
closeAnimationConfig: {
type: Object,
value: function () {
return [
{
name: 'fade-out-animation',
timing: { duration: 150 }
},
{
name: 'paper-menu-shrink-width-animation',
timing: {
delay: 100,
duration: 50,
easing: PaperMenuButton.ANIMATION_CUBIC_BEZIER
}
},
{
name: 'paper-menu-shrink-height-animation',
timing: {
duration: 200,
easing: 'ease-in'
}
}
];
}
},
_dropdownContent: { type: Object }
},
hostAttributes: {
role: 'group',
'aria-haspopup': 'true'
},
listeners: { 'iron-select': '_onIronSelect' },
get contentElement() {
return Polymer.dom(this.$.content).getDistributedNodes()[0];
},
toggle: function () {
if (this.opened) {
this.close();
} else {
this.open();
}
},
open: function () {
if (this.disabled) {
return;
}
this.$.dropdown.open();
},
close: function () {
this.$.dropdown.close();
},
_onIronSelect: function (event) {
if (!this.ignoreSelect) {
this.close();
}
},
_openedChanged: function (opened, oldOpened) {
if (opened) {
this._dropdownContent = this.contentElement;
this.fire('paper-dropdown-open');
} else if (oldOpened != null) {
this.fire('paper-dropdown-close');
}
},
_disabledChanged: function (disabled) {
Polymer.IronControlState._disabledChanged.apply(this, arguments);
if (disabled && this.opened) {
this.close();
}
},
__onIronOverlayCanceled: function (event) {
var uiEvent = event.detail;
var target = Polymer.dom(uiEvent).rootTarget;
var trigger = this.$.trigger;
var path = Polymer.dom(uiEvent).path;
if (path.indexOf(trigger) > -1) {
event.preventDefault();
}
}
});
PaperMenuButton.ANIMATION_CUBIC_BEZIER = 'cubic-bezier(.3,.95,.5,1)';
PaperMenuButton.MAX_ANIMATION_TIME_MS = 400;
Polymer.PaperMenuButton = PaperMenuButton;
}());
(function () {
'use strict';
Polymer({
is: 'paper-dropdown-menu',
behaviors: [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.IronFormElementBehavior,
Polymer.IronValidatableBehavior
],
properties: {
selectedItemLabel: {
type: String,
notify: true,
readOnly: true
},
selectedItem: {
type: Object,
notify: true,
readOnly: true
},
value: {
type: String,
notify: true,
readOnly: true
},
label: { type: String },
placeholder: { type: String },
errorMessage: { type: String },
opened: {
type: Boolean,
notify: true,
value: false,
observer: '_openedChanged'
},
noLabelFloat: {
type: Boolean,
value: false,
reflectToAttribute: true
},
alwaysFloatLabel: {
type: Boolean,
value: false
},
noAnimations: {
type: Boolean,
value: false
},
horizontalAlign: {
type: String,
value: 'right'
},
verticalAlign: {
type: String,
value: 'top'
}
},
listeners: { 'tap': '_onTap' },
keyBindings: {
'up down': 'open',
'esc': 'close'
},
hostAttributes: {
role: 'combobox',
'aria-autocomplete': 'none',
'aria-haspopup': 'true'
},
observers: ['_selectedItemChanged(selectedItem)'],
attached: function () {
var contentElement = this.contentElement;
if (contentElement && contentElement.selectedItem) {
this._setSelectedItem(contentElement.selectedItem);
}
},
get contentElement() {
return Polymer.dom(this.$.content).getDistributedNodes()[0];
},
open: function () {
this.$.menuButton.open();
},
close: function () {
this.$.menuButton.close();
},
_onIronSelect: function (event) {
this._setSelectedItem(event.detail.item);
},
_onIronDeselect: function (event) {
this._setSelectedItem(null);
},
_onTap: function (event) {
if (Polymer.Gestures.findOriginalTarget(event) === this) {
this.open();
}
},
_selectedItemChanged: function (selectedItem) {
var value = '';
if (!selectedItem) {
value = '';
} else {
value = selectedItem.label || selectedItem.textContent.trim();
}
this._setValue(value);
this._setSelectedItemLabel(value);
},
_computeMenuVerticalOffset: function (noLabelFloat) {
return noLabelFloat ? -4 : 8;
},
_getValidity: function (_value) {
return this.disabled || !this.required || this.required && !!this.value;
},
_openedChanged: function () {
var openState = this.opened ? 'true' : 'false';
var e = this.contentElement;
if (e) {
e.setAttribute('aria-expanded', openState);
}
}
});
}());
Polymer.PaperSpinnerBehavior = {
listeners: {
'animationend': '__reset',
'webkitAnimationEnd': '__reset'
},
properties: {
active: {
type: Boolean,
value: false,
reflectToAttribute: true,
observer: '__activeChanged'
},
alt: {
type: String,
value: 'loading',
observer: '__altChanged'
},
__coolingDown: {
type: Boolean,
value: false
}
},
__computeContainerClasses: function (active, coolingDown) {
return [
active || coolingDown ? 'active' : '',
coolingDown ? 'cooldown' : ''
].join(' ');
},
__activeChanged: function (active, old) {
this.__setAriaHidden(!active);
this.__coolingDown = !active && old;
},
__altChanged: function (alt) {
if (alt === this.getPropertyInfo('alt').value) {
this.alt = this.getAttribute('aria-label') || alt;
} else {
this.__setAriaHidden(alt === '');
this.setAttribute('aria-label', alt);
}
},
__setAriaHidden: function (hidden) {
var attr = 'aria-hidden';
if (hidden) {
this.setAttribute(attr, 'true');
} else {
this.removeAttribute(attr);
}
},
__reset: function () {
this.active = false;
this.__coolingDown = false;
}
};
Polymer({
is: 'paper-spinner',
behaviors: [Polymer.PaperSpinnerBehavior]
});
Polymer.IronRangeBehavior = {
properties: {
value: {
type: Number,
value: 0,
notify: true,
reflectToAttribute: true
},
min: {
type: Number,
value: 0,
notify: true
},
max: {
type: Number,
value: 100,
notify: true
},
step: {
type: Number,
value: 1,
notify: true
},
ratio: {
type: Number,
value: 0,
readOnly: true,
notify: true
}
},
observers: ['_update(value, min, max, step)'],
_calcRatio: function (value) {
return (this._clampValue(value) - this.min) / (this.max - this.min);
},
_clampValue: function (value) {
return Math.min(this.max, Math.max(this.min, this._calcStep(value)));
},
_calcStep: function (value) {
value = parseFloat(value);
return this.step ? (Math.round((value + this.min) / this.step) - this.min / this.step) / (1 / this.step) : value;
},
_validateValue: function () {
var v = this._clampValue(this.value);
this.value = this.oldValue = isNaN(v) ? this.oldValue : v;
return this.value !== v;
},
_update: function () {
this._validateValue();
this._setRatio(this._calcRatio(this.value) * 100);
}
};
Polymer({
is: 'paper-progress',
behaviors: [Polymer.IronRangeBehavior],
properties: {
secondaryProgress: {
type: Number,
value: 0
},
secondaryRatio: {
type: Number,
value: 0,
readOnly: true
},
indeterminate: {
type: Boolean,
value: false,
observer: '_toggleIndeterminate'
},
disabled: {
type: Boolean,
value: false,
reflectToAttribute: true,
observer: '_disabledChanged'
}
},
observers: ['_progressChanged(secondaryProgress, value, min, max)'],
hostAttributes: { role: 'progressbar' },
_toggleIndeterminate: function (indeterminate) {
this.toggleClass('indeterminate', indeterminate, this.$.primaryProgress);
},
_transformProgress: function (progress, ratio) {
var transform = 'scaleX(' + ratio / 100 + ')';
progress.style.transform = progress.style.webkitTransform = transform;
},
_mainRatioChanged: function (ratio) {
this._transformProgress(this.$.primaryProgress, ratio);
},
_progressChanged: function (secondaryProgress, value, min, max) {
secondaryProgress = this._clampValue(secondaryProgress);
value = this._clampValue(value);
var secondaryRatio = this._calcRatio(secondaryProgress) * 100;
var mainRatio = this._calcRatio(value) * 100;
this._setSecondaryRatio(secondaryRatio);
this._transformProgress(this.$.secondaryProgress, secondaryRatio);
this._transformProgress(this.$.primaryProgress, mainRatio);
this.secondaryProgress = secondaryProgress;
this.setAttribute('aria-valuenow', value);
this.setAttribute('aria-valuemin', min);
this.setAttribute('aria-valuemax', max);
},
_disabledChanged: function (disabled) {
this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
},
_hideSecondaryProgress: function (secondaryRatio) {
return secondaryRatio === 0;
}
});
Polymer.IronCheckedElementBehaviorImpl = {
properties: {
checked: {
type: Boolean,
value: false,
reflectToAttribute: true,
notify: true,
observer: '_checkedChanged'
},
toggles: {
type: Boolean,
value: true,
reflectToAttribute: true
},
value: {
type: String,
value: 'on',
observer: '_valueChanged'
}
},
observers: ['_requiredChanged(required)'],
created: function () {
this._hasIronCheckedElementBehavior = true;
},
_getValidity: function (_value) {
return this.disabled || !this.required || this.required && this.checked;
},
_requiredChanged: function () {
if (this.required) {
this.setAttribute('aria-required', 'true');
} else {
this.removeAttribute('aria-required');
}
},
_checkedChanged: function () {
this.active = this.checked;
this.fire('iron-change');
},
_valueChanged: function () {
if (this.value === undefined || this.value === null) {
this.value = 'on';
}
}
};
Polymer.IronCheckedElementBehavior = [
Polymer.IronFormElementBehavior,
Polymer.IronValidatableBehavior,
Polymer.IronCheckedElementBehaviorImpl
];
Polymer.PaperCheckedElementBehaviorImpl = {
_checkedChanged: function () {
Polymer.IronCheckedElementBehaviorImpl._checkedChanged.call(this);
if (this.hasRipple()) {
if (this.checked) {
this._ripple.setAttribute('checked', '');
} else {
this._ripple.removeAttribute('checked');
}
}
},
_buttonStateChanged: function () {
Polymer.PaperRippleBehavior._buttonStateChanged.call(this);
if (this.disabled) {
return;
}
if (this.isAttached) {
this.checked = this.active;
}
}
};
Polymer.PaperCheckedElementBehavior = [
Polymer.PaperInkyFocusBehavior,
Polymer.IronCheckedElementBehavior,
Polymer.PaperCheckedElementBehaviorImpl
];
Polymer({
is: 'paper-checkbox',
behaviors: [Polymer.PaperCheckedElementBehavior],
hostAttributes: {
role: 'checkbox',
'aria-checked': false,
tabindex: 0
},
properties: {
ariaActiveAttribute: {
type: String,
value: 'aria-checked'
}
},
_computeCheckboxClass: function (checked, invalid) {
var className = '';
if (checked) {
className += 'checked ';
}
if (invalid) {
className += 'invalid';
}
return className;
},
_computeCheckmarkClass: function (checked) {
return checked ? '' : 'hidden';
},
_createRipple: function () {
this._rippleContainer = this.$.checkboxContainer;
return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this);
}
});
Polymer({
is: 'iron-autogrow-textarea',
behaviors: [
Polymer.IronFormElementBehavior,
Polymer.IronValidatableBehavior,
Polymer.IronControlState
],
properties: {
bindValue: {
observer: '_bindValueChanged',
type: String
},
rows: {
type: Number,
value: 1,
observer: '_updateCached'
},
maxRows: {
type: Number,
value: 0,
observer: '_updateCached'
},
autocomplete: {
type: String,
value: 'off'
},
autofocus: {
type: Boolean,
value: false
},
inputmode: { type: String },
placeholder: { type: String },
readonly: { type: String },
required: { type: Boolean },
maxlength: { type: Number }
},
listeners: { 'input': '_onInput' },
observers: ['_onValueChanged(value)'],
get textarea() {
return this.$.textarea;
},
get selectionStart() {
return this.$.textarea.selectionStart;
},
get selectionEnd() {
return this.$.textarea.selectionEnd;
},
set selectionStart(value) {
this.$.textarea.selectionStart = value;
},
set selectionEnd(value) {
this.$.textarea.selectionEnd = value;
},
validate: function () {
if (!this.required && this.value == '') {
this.invalid = false;
return true;
}
var valid;
if (this.hasValidator()) {
valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
} else {
valid = this.$.textarea.validity.valid;
this.invalid = !valid;
}
this.fire('iron-input-validate');
return valid;
},
_bindValueChanged: function () {
var textarea = this.textarea;
if (!textarea) {
return;
}
if (textarea.value !== this.bindValue) {
textarea.value = !(this.bindValue || this.bindValue === 0) ? '' : this.bindValue;
}
this.value = this.bindValue;
this.$.mirror.innerHTML = this._valueForMirror();
this.fire('bind-value-changed', { value: this.bindValue });
},
_onInput: function (event) {
this.bindValue = event.path ? event.path[0].value : event.target.value;
},
_constrain: function (tokens) {
var _tokens;
tokens = tokens || [''];
if (this.maxRows > 0 && tokens.length > this.maxRows) {
_tokens = tokens.slice(0, this.maxRows);
} else {
_tokens = tokens.slice(0);
}
while (this.rows > 0 && _tokens.length < this.rows) {
_tokens.push('');
}
return _tokens.join('<br/>') + '&#160;';
},
_valueForMirror: function () {
var input = this.textarea;
if (!input) {
return;
}
this.tokens = input && input.value ? input.value.replace(/&/gm, '&amp;').replace(/"/gm, '&quot;').replace(/'/gm, '&#39;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;').split('\n') : [''];
return this._constrain(this.tokens);
},
_updateCached: function () {
this.$.mirror.innerHTML = this._constrain(this.tokens);
},
_onValueChanged: function () {
this.bindValue = this.value;
}
});
Polymer({
is: 'paper-textarea',
behaviors: [
Polymer.PaperInputBehavior,
Polymer.IronFormElementBehavior
],
properties: {
_ariaLabelledBy: {
observer: '_ariaLabelledByChanged',
type: String
},
_ariaDescribedBy: {
observer: '_ariaDescribedByChanged',
type: String
},
rows: {
type: Number,
value: 1
},
maxRows: {
type: Number,
value: 0
}
},
_ariaLabelledByChanged: function (ariaLabelledBy) {
this.$.input.textarea.setAttribute('aria-labelledby', ariaLabelledBy);
},
_ariaDescribedByChanged: function (ariaDescribedBy) {
this.$.input.textarea.setAttribute('aria-describedby', ariaDescribedBy);
},
get _focusableElement() {
return this.$.input.textarea;
}
});
Polymer({
is: 'paper-slider',
behaviors: [
Polymer.IronA11yKeysBehavior,
Polymer.IronFormElementBehavior,
Polymer.PaperInkyFocusBehavior,
Polymer.IronRangeBehavior
],
properties: {
snaps: {
type: Boolean,
value: false,
notify: true
},
pin: {
type: Boolean,
value: false,
notify: true
},
secondaryProgress: {
type: Number,
value: 0,
notify: true,
observer: '_secondaryProgressChanged'
},
editable: {
type: Boolean,
value: false
},
immediateValue: {
type: Number,
value: 0,
readOnly: true,
notify: true
},
maxMarkers: {
type: Number,
value: 0,
notify: true,
observer: '_maxMarkersChanged'
},
expand: {
type: Boolean,
value: false,
readOnly: true
},
dragging: {
type: Boolean,
value: false,
readOnly: true
},
transiting: {
type: Boolean,
value: false,
readOnly: true
},
markers: {
type: Array,
readOnly: true,
value: []
}
},
observers: [
'_updateKnob(value, min, max, snaps, step)',
'_valueChanged(value)',
'_immediateValueChanged(immediateValue)'
],
hostAttributes: {
role: 'slider',
tabindex: 0
},
keyBindings: {
'left down pagedown home': '_decrementKey',
'right up pageup end': '_incrementKey'
},
ready: function () {
this.async(function () {
this._updateKnob(this.value);
}, 1);
},
increment: function () {
this.value = this._clampValue(this.value + this.step);
},
decrement: function () {
this.value = this._clampValue(this.value - this.step);
},
_updateKnob: function (value, min, max, snaps, step) {
this.setAttribute('aria-valuemin', min);
this.setAttribute('aria-valuemax', max);
this.setAttribute('aria-valuenow', value);
this._positionKnob(this._calcRatio(value));
},
_valueChanged: function () {
this.fire('value-change');
},
_immediateValueChanged: function () {
if (this.dragging) {
this.fire('immediate-value-change');
} else {
this.value = this.immediateValue;
}
},
_secondaryProgressChanged: function () {
this.secondaryProgress = this._clampValue(this.secondaryProgress);
},
_expandKnob: function () {
this._setExpand(true);
},
_resetKnob: function () {
this.cancelDebouncer('expandKnob');
this._setExpand(false);
},
_positionKnob: function (ratio) {
this._setImmediateValue(this._calcStep(this._calcKnobPosition(ratio)));
this._setRatio(this._calcRatio(this.immediateValue));
this.$.sliderKnob.style.left = this.ratio * 100 + '%';
if (this.dragging) {
this._knobstartx = this.ratio * this._w;
this.translate3d(0, 0, 0, this.$.sliderKnob);
}
},
_calcKnobPosition: function (ratio) {
return (this.max - this.min) * ratio + this.min;
},
_onTrack: function (event) {
event.stopPropagation();
switch (event.detail.state) {
case 'start':
this._trackStart(event);
break;
case 'track':
this._trackX(event);
break;
case 'end':
this._trackEnd();
break;
}
},
_trackStart: function (event) {
this._w = this.$.sliderBar.offsetWidth;
this._x = this.ratio * this._w;
this._startx = this._x;
this._knobstartx = this._startx;
this._minx = -this._startx;
this._maxx = this._w - this._startx;
this.$.sliderKnob.classList.add('dragging');
this._setDragging(true);
},
_trackX: function (e) {
if (!this.dragging) {
this._trackStart(e);
}
var dx = Math.min(this._maxx, Math.max(this._minx, e.detail.dx));
this._x = this._startx + dx;
var immediateValue = this._calcStep(this._calcKnobPosition(this._x / this._w));
this._setImmediateValue(immediateValue);
var translateX = this._calcRatio(this.immediateValue) * this._w - this._knobstartx;
this.translate3d(translateX + 'px', 0, 0, this.$.sliderKnob);
},
_trackEnd: function () {
var s = this.$.sliderKnob.style;
this.$.sliderKnob.classList.remove('dragging');
this._setDragging(false);
this._resetKnob();
this.value = this.immediateValue;
s.transform = s.webkitTransform = '';
this.fire('change');
},
_knobdown: function (event) {
this._expandKnob();
event.preventDefault();
this.focus();
},
_bardown: function (event) {
this._w = this.$.sliderBar.offsetWidth;
var rect = this.$.sliderBar.getBoundingClientRect();
var ratio = (event.detail.x - rect.left) / this._w;
var prevRatio = this.ratio;
this._setTransiting(true);
this._positionKnob(ratio);
this.debounce('expandKnob', this._expandKnob, 60);
if (prevRatio === this.ratio) {
this._setTransiting(false);
}
this.async(function () {
this.fire('change');
});
event.preventDefault();
this.focus();
},
_knobTransitionEnd: function (event) {
if (event.target === this.$.sliderKnob) {
this._setTransiting(false);
}
},
_maxMarkersChanged: function (maxMarkers) {
if (!this.snaps) {
this._setMarkers([]);
}
var steps = Math.round((this.max - this.min) / this.step);
if (steps > maxMarkers) {
steps = maxMarkers;
}
this._setMarkers(new Array(steps));
},
_mergeClasses: function (classes) {
return Object.keys(classes).filter(function (className) {
return classes[className];
}).join(' ');
},
_getClassNames: function () {
return this._mergeClasses({
disabled: this.disabled,
pin: this.pin,
snaps: this.snaps,
ring: this.immediateValue <= this.min,
expand: this.expand,
dragging: this.dragging,
transiting: this.transiting,
editable: this.editable
});
},
_incrementKey: function (event) {
if (!this.disabled) {
if (event.detail.key === 'end') {
this.value = this.max;
} else {
this.increment();
}
this.fire('change');
}
},
_decrementKey: function (event) {
if (!this.disabled) {
if (event.detail.key === 'home') {
this.value = this.min;
} else {
this.decrement();
}
this.fire('change');
}
},
_changeValue: function (event) {
this.value = event.target.value;
this.fire('change');
},
_inputKeyDown: function (event) {
event.stopPropagation();
},
_createRipple: function () {
this._rippleContainer = this.$.sliderKnob;
return Polymer.PaperInkyFocusBehaviorImpl._createRipple.call(this);
},
_focusedChanged: function (receivedFocusFromKeyboard) {
if (receivedFocusFromKeyboard) {
this.ensureRipple();
}
if (this.hasRipple()) {
if (receivedFocusFromKeyboard) {
this._ripple.style.display = '';
} else {
this._ripple.style.display = 'none';
}
this._ripple.holdDown = receivedFocusFromKeyboard;
}
}
});
Polymer({
is: 'paper-radio-button',
behaviors: [Polymer.PaperCheckedElementBehavior],
hostAttributes: {
role: 'radio',
'aria-checked': false,
tabindex: 0
},
properties: {
ariaActiveAttribute: {
type: String,
value: 'aria-checked'
}
},
ready: function () {
this._rippleContainer = this.$.radioContainer;
}
});
Polymer({
is: 'paper-radio-group',
behaviors: [
Polymer.IronA11yKeysBehavior,
Polymer.IronSelectableBehavior
],
hostAttributes: {
role: 'radiogroup',
tabindex: 0
},
properties: {
attrForSelected: {
type: String,
value: 'name'
},
selectedAttribute: {
type: String,
value: 'checked'
},
selectable: {
type: String,
value: 'paper-radio-button'
},
allowEmptySelection: {
type: Boolean,
value: false
}
},
keyBindings: {
'left up': 'selectPrevious',
'right down': 'selectNext'
},
select: function (value) {
if (this.selected) {
var oldItem = this._valueToItem(this.selected);
if (this.selected == value) {
if (this.allowEmptySelection) {
value = '';
} else {
if (oldItem)
oldItem.checked = true;
return;
}
}
if (oldItem)
oldItem.checked = false;
}
Polymer.IronSelectableBehavior.select.apply(this, [value]);
this.fire('paper-radio-group-changed');
},
selectPrevious: function () {
var length = this.items.length;
var newIndex = Number(this._valueToIndex(this.selected));
do {
newIndex = (newIndex - 1 + length) % length;
} while (this.items[newIndex].disabled);
this._itemActivate(this._indexToValue(newIndex), this.items[newIndex]);
},
selectNext: function () {
var length = this.items.length;
var newIndex = Number(this._valueToIndex(this.selected));
do {
newIndex = (newIndex + 1 + length) % length;
} while (this.items[newIndex].disabled);
this._itemActivate(this._indexToValue(newIndex), this.items[newIndex]);
}
});
Polymer({
is: 'paper-toggle-button',
behaviors: [Polymer.PaperCheckedElementBehavior],
hostAttributes: {
role: 'button',
'aria-pressed': 'false',
tabindex: 0
},
properties: {},
listeners: { track: '_ontrack' },
_ontrack: function (event) {
var track = event.detail;
if (track.state === 'start') {
this._trackStart(track);
} else if (track.state === 'track') {
this._trackMove(track);
} else if (track.state === 'end') {
this._trackEnd(track);
}
},
_trackStart: function (track) {
this._width = this.$.toggleBar.offsetWidth / 2;
this._trackChecked = this.checked;
this.$.toggleButton.classList.add('dragging');
},
_trackMove: function (track) {
var dx = track.dx;
this._x = Math.min(this._width, Math.max(0, this._trackChecked ? this._width + dx : dx));
this.translate3d(this._x + 'px', 0, 0, this.$.toggleButton);
this._userActivate(this._x > this._width / 2);
},
_trackEnd: function (track) {
this.$.toggleButton.classList.remove('dragging');
this.transform('', this.$.toggleButton);
},
_createRipple: function () {
this._rippleContainer = this.$.toggleButton;
var ripple = Polymer.PaperRippleBehavior._createRipple();
ripple.id = 'ink';
ripple.setAttribute('recenters', '');
ripple.classList.add('circle', 'toggle-ink');
return ripple;
}
});
(function () {
var currentToast = null;
Polymer({
is: 'paper-toast',
behaviors: [Polymer.IronOverlayBehavior],
properties: {
duration: {
type: Number,
value: 3000
},
text: {
type: String,
value: ''
},
noCancelOnOutsideClick: {
type: Boolean,
value: true
},
noAutoFocus: {
type: Boolean,
value: true
}
},
listeners: { 'transitionend': '__onTransitionEnd' },
get visible() {
console.warn('`visible` is deprecated, use `opened` instead');
return this.opened;
},
get _canAutoClose() {
return this.duration > 0 && this.duration !== Infinity;
},
created: function () {
this._autoClose = null;
Polymer.IronA11yAnnouncer.requestAvailability();
},
show: function (properties) {
if (typeof properties == 'string') {
properties = { text: properties };
}
for (var property in properties) {
if (property.indexOf('_') === 0) {
console.warn('The property "' + property + '" is private and was not set.');
} else if (property in this) {
this[property] = properties[property];
} else {
console.warn('The property "' + property + '" is not valid.');
}
}
this.open();
},
hide: function () {
this.close();
},
center: function () {
if (this.fitInto === window) {
this.style.bottom = this.style.left = '';
} else {
var rect = this.fitInto.getBoundingClientRect();
this.style.left = rect.left + 'px';
this.style.bottom = window.innerHeight - rect.bottom + 'px';
}
},
__onTransitionEnd: function (e) {
if (e && e.target === this && e.propertyName === 'opacity') {
if (this.opened) {
this._finishRenderOpened();
} else {
this._finishRenderClosed();
}
}
},
_openedChanged: function () {
if (this._autoClose !== null) {
this.cancelAsync(this._autoClose);
this._autoClose = null;
}
if (this.opened) {
if (currentToast && currentToast !== this) {
currentToast.close();
}
currentToast = this;
this.fire('iron-announce', { text: this.text });
if (this._canAutoClose) {
this._autoClose = this.async(this.close, this.duration);
}
} else if (currentToast === this) {
currentToast = null;
}
Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
},
_renderOpened: function () {
this.classList.add('paper-toast-open');
},
_renderClosed: function () {
this.classList.remove('paper-toast-open');
},
_onIronResize: function () {
Polymer.IronOverlayBehaviorImpl._onIronResize.apply(this, arguments);
if (this.opened) {
this.style.position = '';
}
}
});
}());
(function () {
Polymer({
is: 'paper-menu',
behaviors: [Polymer.IronMenuBehavior]
});
}());
Polymer({
is: 'iron-collapse',
behaviors: [Polymer.IronResizableBehavior],
properties: {
horizontal: {
type: Boolean,
value: false,
observer: '_horizontalChanged'
},
opened: {
type: Boolean,
value: false,
notify: true,
observer: '_openedChanged'
},
noAnimation: { type: Boolean }
},
get dimension() {
return this.horizontal ? 'width' : 'height';
},
hostAttributes: {
role: 'group',
'aria-hidden': 'true',
'aria-expanded': 'false'
},
listeners: { transitionend: '_transitionEnd' },
attached: function () {
this._transitionEnd();
},
toggle: function () {
this.opened = !this.opened;
},
show: function () {
this.opened = true;
},
hide: function () {
this.opened = false;
},
updateSize: function (size, animated) {
if (this.style[this.dimension] === size) {
return;
}
this._updateTransition(false);
if (animated && !this.noAnimation && this._isDisplayed) {
var startSize = this._calcSize();
if (size === 'auto') {
this.style[this.dimension] = size;
size = this._calcSize();
}
this.style[this.dimension] = startSize;
this.offsetHeight = this.offsetHeight;
this._updateTransition(true);
}
this.style[this.dimension] = size;
},
enableTransition: function (enabled) {
console.warn('`enableTransition()` is deprecated, use `noAnimation` instead.');
this.noAnimation = !enabled;
},
_updateTransition: function (enabled) {
this.style.transitionDuration = enabled && !this.noAnimation ? '' : '0s';
},
_horizontalChanged: function () {
this.style.transitionProperty = this.dimension;
var otherDimension = this.dimension === 'width' ? 'height' : 'width';
this.style[otherDimension] = '';
this.updateSize(this.opened ? 'auto' : '0px', false);
},
_openedChanged: function () {
this.setAttribute('aria-expanded', this.opened);
this.setAttribute('aria-hidden', !this.opened);
this.toggleClass('iron-collapse-closed', false);
this.toggleClass('iron-collapse-opened', false);
this.updateSize(this.opened ? 'auto' : '0px', true);
if (this.opened) {
this.focus();
}
if (this.noAnimation) {
this._transitionEnd();
}
},
_transitionEnd: function () {
if (this.opened) {
this.style[this.dimension] = 'auto';
}
this.toggleClass('iron-collapse-closed', !this.opened);
this.toggleClass('iron-collapse-opened', this.opened);
this._updateTransition(false);
this.notifyResize();
},
get _isDisplayed() {
var rect = this.getBoundingClientRect();
for (var prop in rect) {
if (rect[prop] !== 0)
return true;
}
return false;
},
_calcSize: function () {
return this.getBoundingClientRect()[this.dimension] + 'px';
}
});
(function () {
Polymer({
is: 'paper-submenu',
properties: {
opened: {
type: Boolean,
value: false,
notify: true,
observer: '_openedChanged'
}
},
behaviors: [Polymer.IronControlState],
listeners: { 'focus': '_onFocus' },
get __parent() {
return Polymer.dom(this).parentNode;
},
get __trigger() {
return Polymer.dom(this.$.trigger).getDistributedNodes()[0];
},
get __content() {
return Polymer.dom(this.$.content).getDistributedNodes()[0];
},
attached: function () {
this.listen(this.__parent, 'iron-activate', '_onParentIronActivate');
},
dettached: function () {
this.unlisten(this.__parent, 'iron-activate', '_onParentIronActivate');
},
open: function () {
if (!this.disabled && !this._active) {
this.$.collapse.show();
this._active = true;
this.__trigger && this.__trigger.classList.add('iron-selected');
this.__content && this.__content.focus();
}
},
close: function () {
if (this._active) {
this.$.collapse.hide();
this._active = false;
this.__trigger && this.__trigger.classList.remove('iron-selected');
}
},
toggle: function () {
if (this._active) {
this.close();
} else {
this.open();
}
},
_onTap: function (e) {
if (!this.disabled) {
this.toggle();
}
},
_openedChanged: function (opened, oldOpened) {
if (opened) {
this.fire('paper-submenu-open');
} else if (oldOpened != null) {
this.fire('paper-submenu-close');
}
},
_onParentIronActivate: function (event) {
var parent = this.__parent;
if (Polymer.dom(event).localTarget === parent) {
if (event.detail.item !== this && !parent.multi) {
this.close();
}
}
},
_disabledChanged: function (disabled) {
Polymer.IronControlState._disabledChanged.apply(this, arguments);
if (disabled && this._active) {
this.close();
}
},
_onFocus: function (event) {
this.__trigger && this.__trigger.focus();
}
});
}());
Polymer.PaperItemBehaviorImpl = {
hostAttributes: {
role: 'option',
tabindex: '0'
}
};
Polymer.PaperItemBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperItemBehaviorImpl
];
Polymer({
is: 'paper-item',
behaviors: [Polymer.PaperItemBehavior]
});
(function () {
'use strict';
var SHADOW_WHEN_SCROLLING = 1;
var SHADOW_ALWAYS = 2;
var MODE_CONFIGS = {
outerScroll: { 'scroll': true },
shadowMode: {
'standard': SHADOW_ALWAYS,
'waterfall': SHADOW_WHEN_SCROLLING,
'waterfall-tall': SHADOW_WHEN_SCROLLING
},
tallMode: { 'waterfall-tall': true }
};
Polymer({
is: 'paper-header-panel',
properties: {
mode: {
type: String,
value: 'standard',
observer: '_modeChanged',
reflectToAttribute: true
},
shadow: {
type: Boolean,
value: false
},
tallClass: {
type: String,
value: 'tall'
},
atTop: {
type: Boolean,
value: true,
notify: true,
readOnly: true,
reflectToAttribute: true
}
},
observers: ['_computeDropShadowHidden(atTop, mode, shadow)'],
ready: function () {
this.scrollHandler = this._scroll.bind(this);
},
attached: function () {
this._addListener();
this._keepScrollingState();
},
detached: function () {
this._removeListener();
},
get header() {
return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
},
get scroller() {
return this._getScrollerForMode(this.mode);
},
get visibleShadow() {
return this.$.dropShadow.classList.contains('has-shadow');
},
_computeDropShadowHidden: function (atTop, mode, shadow) {
var shadowMode = MODE_CONFIGS.shadowMode[mode];
if (this.shadow) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_ALWAYS) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_WHEN_SCROLLING && !atTop) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else {
this.toggleClass('has-shadow', false, this.$.dropShadow);
}
},
_computeMainContainerClass: function (mode) {
var classes = {};
classes['flex'] = mode !== 'cover';
return Object.keys(classes).filter(function (className) {
return classes[className];
}).join(' ');
},
_addListener: function () {
this.scroller.addEventListener('scroll', this.scrollHandler, false);
},
_removeListener: function () {
this.scroller.removeEventListener('scroll', this.scrollHandler);
},
_modeChanged: function (newMode, oldMode) {
var configs = MODE_CONFIGS;
var header = this.header;
var animateDuration = 200;
if (header) {
if (configs.tallMode[oldMode] && !configs.tallMode[newMode]) {
header.classList.remove(this.tallClass);
this.async(function () {
header.classList.remove('animate');
}, animateDuration);
} else {
header.classList.toggle('animate', configs.tallMode[newMode]);
}
}
this._keepScrollingState();
},
_keepScrollingState: function () {
var main = this.scroller;
var header = this.header;
this._setAtTop(main.scrollTop === 0);
if (header && this.tallClass && MODE_CONFIGS.tallMode[this.mode]) {
this.toggleClass(this.tallClass, this.atTop || header.classList.contains(this.tallClass) && main.scrollHeight < this.offsetHeight, header);
}
},
_scroll: function () {
this._keepScrollingState();
this.fire('content-scroll', { target: this.scroller }, { bubbles: false });
},
_getScrollerForMode: function (mode) {
return MODE_CONFIGS.outerScroll[mode] ? this : this.$.mainContainer;
}
});
}());
Polymer.PaperDialogBehaviorImpl = {
hostAttributes: {
'role': 'dialog',
'tabindex': '-1'
},
properties: {
modal: {
type: Boolean,
value: false
}
},
observers: ['_modalChanged(modal, _readied)'],
listeners: { 'tap': '_onDialogClick' },
ready: function () {
this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
this.__prevWithBackdrop = this.withBackdrop;
},
_modalChanged: function (modal, readied) {
if (modal) {
this.setAttribute('aria-modal', 'true');
} else {
this.setAttribute('aria-modal', 'false');
}
if (!readied) {
return;
}
if (modal) {
this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
this.__prevWithBackdrop = this.withBackdrop;
this.noCancelOnOutsideClick = true;
this.noCancelOnEscKey = true;
this.withBackdrop = true;
} else {
this.noCancelOnOutsideClick = this.noCancelOnOutsideClick && this.__prevNoCancelOnOutsideClick;
this.noCancelOnEscKey = this.noCancelOnEscKey && this.__prevNoCancelOnEscKey;
this.withBackdrop = this.withBackdrop && this.__prevWithBackdrop;
}
},
_updateClosingReasonConfirmed: function (confirmed) {
this.closingReason = this.closingReason || {};
this.closingReason.confirmed = confirmed;
},
_onDialogClick: function (event) {
var path = Polymer.dom(event).path;
for (var i = 0; i < path.indexOf(this); i++) {
var target = path[i];
if (target.hasAttribute && (target.hasAttribute('dialog-dismiss') || target.hasAttribute('dialog-confirm'))) {
this._updateClosingReasonConfirmed(target.hasAttribute('dialog-confirm'));
this.close();
event.stopPropagation();
break;
}
}
}
};
Polymer.PaperDialogBehavior = [
Polymer.IronOverlayBehavior,
Polymer.PaperDialogBehaviorImpl
];
(function () {
Polymer({
is: 'paper-dialog',
behaviors: [
Polymer.PaperDialogBehavior,
Polymer.NeonAnimationRunnerBehavior
],
listeners: { 'neon-animation-finish': '_onNeonAnimationFinish' },
_renderOpened: function () {
this.cancelAnimation();
if (this.withBackdrop) {
this.backdropElement.open();
}
this.playAnimation('entry');
},
_renderClosed: function () {
this.cancelAnimation();
if (this.withBackdrop) {
this.backdropElement.close();
}
this.playAnimation('exit');
},
_onNeonAnimationFinish: function () {
if (this.opened) {
this._finishRenderOpened();
} else {
this._finishRenderClosed();
}
}
});
}());
Polymer({
is: 'paper-tooltip',
hostAttributes: {
role: 'tooltip',
tabindex: -1
},
behaviors: [Polymer.NeonAnimationRunnerBehavior],
properties: {
for: {
type: String,
observer: '_forChanged'
},
manualMode: {
type: Boolean,
value: false
},
position: {
type: String,
value: 'bottom'
},
fitToVisibleBounds: {
type: Boolean,
value: false
},
offset: {
type: Number,
value: 14
},
marginTop: {
type: Number,
value: 14
},
animationDelay: {
type: Number,
value: 500
},
animationConfig: {
type: Object,
value: function () {
return {
'entry': [{
name: 'fade-in-animation',
node: this,
timing: { delay: 0 }
}],
'exit': [{
name: 'fade-out-animation',
node: this
}]
};
}
},
_showing: {
type: Boolean,
value: false
}
},
listeners: {
'neon-animation-finish': '_onAnimationFinish',
'mouseenter': 'hide'
},
get target() {
var parentNode = Polymer.dom(this).parentNode;
var ownerRoot = Polymer.dom(this).getOwnerRoot();
var target;
if (this.for) {
target = Polymer.dom(ownerRoot).querySelector('#' + this.for);
} else {
target = parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE ? ownerRoot.host : parentNode;
}
return target;
},
attached: function () {
this._target = this.target;
if (this.manualMode)
return;
this.listen(this._target, 'mouseenter', 'show');
this.listen(this._target, 'focus', 'show');
this.listen(this._target, 'mouseleave', 'hide');
this.listen(this._target, 'blur', 'hide');
this.listen(this._target, 'tap', 'hide');
},
detached: function () {
if (this._target && !this.manualMode) {
this.unlisten(this._target, 'mouseenter', 'show');
this.unlisten(this._target, 'focus', 'show');
this.unlisten(this._target, 'mouseleave', 'hide');
this.unlisten(this._target, 'blur', 'hide');
this.unlisten(this._target, 'tap', 'hide');
}
},
show: function () {
if (this._showing)
return;
if (Polymer.dom(this).textContent.trim() === '')
return;
this.cancelAnimation();
this._showing = true;
this.toggleClass('hidden', false, this.$.tooltip);
this.updatePosition();
this.animationConfig.entry[0].timing.delay = this.animationDelay;
this._animationPlaying = true;
this.playAnimation('entry');
},
hide: function () {
if (!this._showing) {
return;
}
if (this._animationPlaying) {
this.cancelAnimation();
this._showing = false;
this._onAnimationFinish();
return;
}
this._showing = false;
this._animationPlaying = true;
this.playAnimation('exit');
},
_forChanged: function () {
this._target = this.target;
},
updatePosition: function () {
if (!this._target || !this.offsetParent)
return;
var offset = this.offset;
if (this.marginTop != 14 && this.offset == 14)
offset = this.marginTop;
var parentRect = this.offsetParent.getBoundingClientRect();
var targetRect = this._target.getBoundingClientRect();
var thisRect = this.getBoundingClientRect();
var horizontalCenterOffset = (targetRect.width - thisRect.width) / 2;
var verticalCenterOffset = (targetRect.height - thisRect.height) / 2;
var targetLeft = targetRect.left - parentRect.left;
var targetTop = targetRect.top - parentRect.top;
var tooltipLeft, tooltipTop;
switch (this.position) {
case 'top':
tooltipLeft = targetLeft + horizontalCenterOffset;
tooltipTop = targetTop - thisRect.height - offset;
break;
case 'bottom':
tooltipLeft = targetLeft + horizontalCenterOffset;
tooltipTop = targetTop + targetRect.height + offset;
break;
case 'left':
tooltipLeft = targetLeft - thisRect.width - offset;
tooltipTop = targetTop + verticalCenterOffset;
break;
case 'right':
tooltipLeft = targetLeft + targetRect.width + offset;
tooltipTop = targetTop + verticalCenterOffset;
break;
}
if (this.fitToVisibleBounds) {
if (tooltipLeft + thisRect.width > window.innerWidth) {
this.style.right = '0px';
this.style.left = 'auto';
} else {
this.style.left = Math.max(0, tooltipLeft) + 'px';
this.style.right = 'auto';
}
if (tooltipTop + thisRect.height > window.innerHeight) {
this.style.bottom = '0px';
this.style.top = 'auto';
} else {
this.style.top = Math.max(0, tooltipTop) + 'px';
this.style.bottom = 'auto';
}
} else {
this.style.left = tooltipLeft + 'px';
this.style.top = tooltipTop + 'px';
}
},
_onAnimationFinish: function () {
this._animationPlaying = false;
if (!this._showing) {
this.toggleClass('hidden', true, this.$.tooltip);
}
}
});
Polymer({
is: 'paper-badge',
hostAttributes: {
tabindex: '0',
role: 'status'
},
behaviors: [Polymer.IronResizableBehavior],
listeners: { 'iron-resize': 'updatePosition' },
properties: {
for: {
type: String,
observer: '_forChanged'
},
label: {
type: String,
observer: '_labelChanged'
},
icon: {
type: String,
value: ''
}
},
attached: function () {
this._updateTarget();
},
_forChanged: function () {
if (!this.isAttached) {
return;
}
this._updateTarget();
},
_labelChanged: function () {
this.setAttribute('aria-label', this.label);
},
_updateTarget: function () {
this._target = this.target;
this.async(this.notifyResize, 1);
},
_computeIsIconBadge: function (icon) {
return icon.length > 0;
},
get target() {
var parentNode = Polymer.dom(this).parentNode;
var ownerRoot = Polymer.dom(this).getOwnerRoot();
var target;
if (this.for) {
target = Polymer.dom(ownerRoot).querySelector('#' + this.for);
} else {
target = parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE ? ownerRoot.host : parentNode;
}
return target;
},
updatePosition: function () {
if (!this._target)
return;
if (!this.offsetParent)
return;
var parentRect = this.offsetParent.getBoundingClientRect();
var targetRect = this._target.getBoundingClientRect();
var thisRect = this.getBoundingClientRect();
this.style.left = targetRect.left - parentRect.left + (targetRect.width - thisRect.width / 2) + 'px';
this.style.top = targetRect.top - parentRect.top - thisRect.height / 2 + 'px';
}
});
Polymer({
is: 'scale-up-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
if (config.transformOrigin) {
this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
}
var scaleProperty = 'scale(0)';
if (config.axis === 'x') {
scaleProperty = 'scale(0, 1)';
} else if (config.axis === 'y') {
scaleProperty = 'scale(1, 0)';
}
this._effect = new KeyframeEffect(node, [
{ 'transform': scaleProperty },
{ 'transform': 'scale(1, 1)' }
], this.timingFromConfig(config));
return this._effect;
}
});
Polymer({
is: 'scale-down-animation',
behaviors: [Polymer.NeonAnimationBehavior],
configure: function (config) {
var node = config.node;
if (config.transformOrigin) {
this.setPrefixedProperty(node, 'transformOrigin', config.transformOrigin);
}
var scaleProperty = 'scale(0, 0)';
if (config.axis === 'x') {
scaleProperty = 'scale(0, 1)';
} else if (config.axis === 'y') {
scaleProperty = 'scale(1, 0)';
}
this._effect = new KeyframeEffect(node, [
{ 'transform': 'scale(1,1)' },
{ 'transform': scaleProperty }
], this.timingFromConfig(config));
return this._effect;
}
});