"use strict";
function getCssProperty(name, _default = "") {
    let propertyValue = window.getComputedStyle(document.body).getPropertyValue(name);
    if (propertyValue == "")
        return _default;
    return propertyValue;
}
function getCssFloatProperty(name, _default) {
    let propertyValue = getCssProperty(name);
    try {
        let value = parseFloat(propertyValue);
        if (isNaN(value))
            return _default;
        return value;
    }
    catch (err) {
        console.log("default", _default);
        return _default;
    }
}
function SCALE_FACTOR() {
    let rootFontSize = document.documentElement.style.fontSize;
    return (rootFontSize == null) || (rootFontSize == "") ? 1 : parseFloat(rootFontSize.replace("px", ""));
}
let LOG_BUFFER_SIZE = 50;
class Logitem {
    constructor(text, kind = "normal") {
        this.text = text;
        this.kind = kind;
        this.now = new Date();
    }
}
class Log {
    constructor() {
        this.items = [];
    }
    log(li) {
        this.items.unshift(li);
        if (this.items.length > LOG_BUFFER_SIZE)
            this.items.pop();
    }
}
class Vect {
    constructor(_x, _y) {
        this.x = _x;
        this.y = _y;
    }
    calctrig(r, multrby = Math.PI) {
        this.sin = Math.sin(r * multrby);
        this.cos = Math.cos(r * multrby);
    }
    r(r) {
        this.calctrig(r);
        return new Vect(this.x * this.cos - this.y * this.sin, this.x * this.sin + this.y * this.cos);
    }
    n(l) {
        let c = (l / this.l());
        return new Vect(this.x * c, this.y * c);
    }
    u() { return this.n(1); }
    p(v) {
        return new Vect(this.x + v.x, this.y + v.y);
    }
    m(v) {
        return new Vect(this.x - v.x, this.y - v.y);
    }
    i() {
        return new Vect(-this.x, -this.y);
    }
    s(s) {
        return new Vect(this.x * s, this.y * s);
    }
    l() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    unsc() {
        return this.s(1 / SCALE_FACTOR());
    }
    sc() {
        return this.s(SCALE_FACTOR());
    }
}
let INFINITE_COORD = 1E6;
class Polygon {
    constructor() {
        this.vects = [];
    }
    a(v) {
        this.vects.push(v);
        return this;
    }
    normalize(overwrite = true) {
        let minx = INFINITE_COORD;
        let miny = INFINITE_COORD;
        let maxx = -INFINITE_COORD;
        let maxy = -INFINITE_COORD;
        this.vects.map(v => {
            if (v.x < minx)
                minx = v.x;
            if (v.y < miny)
                miny = v.y;
            if (v.x > maxx)
                maxx = v.x;
            if (v.y > maxy)
                maxy = v.y;
        });
        let min = new Vect(minx, miny);
        let max = new Vect(maxx, maxy);
        this.shift = min.i();
        this.size = max.m(min);
        if (overwrite) {
            this.vects = this.vects.map(v => v.p(this.shift));
        }
        return this;
    }
    // should only be called on a normalized polygon
    reportSvg(bcol = "#dfdf3f") {
        let points = this.vects.map(v => (v.x + "," + v.y)).join(" ");
        return `
<svg width="${this.size.x}" height="${this.size.y}" style="position:absolute;top:0px;left:0px;">
<polygon points="${points}" style="fill:${bcol};stroke-width:0px;">
</svg>
`;
    }
}
class Arrow {
    constructor(from, to, params) {
        let widthfactor = params["widthfactor"] || 0.1;
        let handlelength = params["handlelength"] || 0.7;
        let headfactor = params["headfactor"] || 0.2;
        let constantwidth = params["constantwidth"] || 0.0;
        let cw = (constantwidth != 0.0);
        let diff = to.m(from);
        let width = cw ? constantwidth : diff.l() * widthfactor;
        let bottomright = cw ? diff.n(constantwidth / 2.0).r(0.5) : diff.n(width / 2.0).r(0.5);
        let bottomleft = bottomright.i();
        let handle = cw ? diff.n(diff.l() - 3.0 * constantwidth) : diff.n(diff.l() * handlelength);
        let headfromright = bottomright.p(handle);
        let headfromleft = bottomleft.p(handle);
        let headtoright = headfromright.p(cw ? bottomright.s(2.0) : bottomright.n(diff.l() * headfactor));
        let headtoleft = headfromleft.p(cw ? bottomleft.s(2.0) : bottomleft.n(diff.l() * headfactor));
        let pg = new Polygon().
            a(bottomright).
            a(headfromright).
            a(headtoright).
            a(diff).
            a(headtoleft).
            a(headfromleft).
            a(bottomleft).
            normalize();
        this.svgorig = to.m(pg.vects[3]);
        this.svg = pg.reportSvg(params["color"]);
    }
}
let FONT_SIZE = getCssFloatProperty("--fontsize", 15);
let DEBUG = true;
let conslog = (content) => console.log(content);
function getGeneralScrollBarWidthPx() {
    return getCssFloatProperty("--generalscrollbarwidthpx", 30);
}
function getGeneralScrollBarWidthRem() {
    return getGeneralScrollBarWidthPx() / SCALE_FACTOR();
}
let windowResizeEventRecipients = [];
function registerForWindowResizeEvent(e) {
    windowResizeEventRecipients.push(e);
}
function getGeneralWindowWidthCorrectionPx() {
    return getCssFloatProperty("--windowwidthcorrection", 5);
}
function getGeneralWindowWidthCorrectionRem() {
    return getGeneralWindowWidthCorrectionPx() / SCALE_FACTOR();
}
function getGeneralWindowHeightCorrectionPx() {
    return getCssFloatProperty("--windowheightcorrection", 5);
}
function getGeneralWindowHeightCorrectionRem() {
    return getGeneralWindowHeightCorrectionPx() / SCALE_FACTOR();
}
function getCorrectedWindowWidthPx() {
    return window.innerWidth - getGeneralWindowWidthCorrectionPx();
}
function getCorrectedWindowWidthRem() {
    return getCorrectedWindowWidthPx() / SCALE_FACTOR();
}
function getCorrectedWindowHeightPx() {
    return window.innerHeight - getGeneralWindowHeightCorrectionPx();
}
function getCorrectedWindowHeightRem() {
    return getCorrectedWindowHeightPx() / SCALE_FACTOR();
}
function windowResizeHandler(ev) {
    for (let e of windowResizeEventRecipients)
        e.windowResizeHandler();
}
function setRem(rem) {
    document.documentElement.style.fontSize = rem + "px";
    windowResizeHandler(null);
}
window.addEventListener("resize", windowResizeHandler);
class DomElement {
    constructor(tag) {
        this.id = null;
        this.snaptowindow = false;
        this.e = document.createElement(tag);
    }
    windowResizeHandler() {
        return this;
    }
    snapToWindow(snap = true) {
        this.snaptowindow = snap;
        registerForWindowResizeEvent(this);
        return this;
    }
    onBind() {
        // abstract        
        // should be used to initialize from bind
    }
    bind(domstore, domstorekey, _default) {
        this.domstore = domstore;
        this.domstorekey = domstorekey;
        this.default = _default;
        this.onBind();
        return this;
    }
    get activate() {
        return this;
    }
    resizeToWidth(width) { return this; }
    resizeToHeight(width) { return this; }
    focus() {
        this.e.focus();
        return this;
    }
    get focusLater() {
        setTimeout(this.focus.bind(this), 0);
        return this;
    }
    get x() {
        return this.h("");
    }
    getAttribute(name) {
        let attr = this.e.getAttribute(name);
        return attr == null ? "" : attr;
    }
    //////////////////////////////////////////////     
    setPosition(value) {
        this.e.style.position = value;
        return this;
    }
    pr() {
        return this.setPosition("relative");
    }
    pa() {
        return this.setPosition("absolute");
    }
    //////////////////////////////////////////////     
    removeClass(klass) {
        let parts = this.getAttribute("class").split(" ").filter(value => value != klass);
        this.setAttribute("class", parts.join(" "));
        return this;
    }
    addClass(klass) {
        this.removeClass(klass);
        let parts = this.getAttribute("class").split(" ");
        parts.push(klass);
        this.setAttribute("class", parts.join(" "));
        return this;
    }
    ac(klass) {
        return this.addClass(klass);
    }
    //////////////////////////////////////////////        
    fromJson(json) {
        return this;
    }
    fromJsonText(jsontext) {
        if (jsontext == null)
            return this;
        try {
            let json = JSON.parse(jsontext);
            this.fromJson(json);
        }
        catch (err) { }
        return this;
    }
    get storedJsonText() {
        if (this.id == null)
            return null;
        return localStorage.getItem(this.id);
    }
    get fromStored() {
        if (this.id == null)
            return this;
        this.fromJsonText(this.storedJsonText);
        if (DEBUG)
            conslog(`fromstored ${this.toJsonText}`);
        return this;
    }
    get toJsonText() {
        return JSON.stringify(this);
    }
    get store() {
        if (this.id == null)
            return this;
        let jsontext = this.toJsonText;
        if (DEBUG)
            conslog(`store ${jsontext}`);
        localStorage.setItem(this.id, jsontext);
        return this;
    }
    //////////////////////////////////////////////        
    setBackground(value) {
        this.e.style.background = value;
        return this;
    }
    burl(url) {
        return this.setBackground(`url(${url})`);
    }
    //////////////////////////////////////////////        
    setOverflow(value) {
        this.e.style.overflow = value;
        return this;
    }
    get os() {
        return this.setOverflow("scroll");
    }
    //////////////////////////////////////////////    
    setClass(klass) {
        return this.setAttribute("class", klass);
    }
    c(klass) {
        return this.setClass(klass);
    }
    //////////////////////////////////////////////    
    setWidth(value) {
        this.e.style.width = value;
        return this;
    }
    setWidthRem(rem) {
        return this.setWidth(`${rem}rem`);
    }
    w(rem) {
        return this.setWidthRem(rem);
    }
    //////////////////////////////////////////////    
    setHeight(value) {
        this.e.style.height = value;
        return this;
    }
    setHeightRem(rem) {
        return this.setHeight(`${rem}rem`);
    }
    he(rem) {
        return this.setHeightRem(rem);
    }
    //////////////////////////////////////////////
    z(w, h) {
        return this.w(w).he(h);
    }
    //////////////////////////////////////////////    
    setLeft(value) {
        this.e.style.left = value;
        return this;
    }
    setLeftRem(rem) {
        return this.setLeft(`${rem}rem`);
    }
    l(rem) {
        return this.setLeftRem(rem);
    }
    //////////////////////////////////////////////    
    setTop(value) {
        this.e.style.top = value;
        return this;
    }
    setTopRem(rem) {
        return this.setTop(`${rem}rem`);
    }
    t(rem) {
        return this.setTopRem(rem);
    }
    //////////////////////////////////////////////
    o(left, top) {
        return this.l(left).t(top);
    }
    //////////////////////////////////////////////
    r(left, top, width, height) {
        return this.o(left, top).z(width, height);
    }
    //////////////////////////////////////////////
    setPadding(value) {
        this.e.style.padding = value;
        return this;
    }
    setPaddingRem(rem) {
        return this.setPadding(`${rem}rem`);
    }
    p(rem) {
        return this.setPaddingRem(rem);
    }
    //////////////////////////////////////////////
    setInnerHTML(content) {
        this.e.innerHTML = content;
        return this;
    }
    h(content) {
        return this.setInnerHTML(content);
    }
    //////////////////////////////////////////////
    appendChild(e) {
        this.e.appendChild(e.e);
        return this;
    }
    //////////////////////////////////////////////
    appendChilds(es) {
        for (let e of es) {
            this.appendChild(e);
        }
        return this;
    }
    a(es) {
        return this.appendChilds(es);
    }
    //////////////////////////////////////////////
    setBackgroundColor(value) {
        this.e.style.backgroundColor = value;
        return this;
    }
    //////////////////////////////////////////////
    setFontSize(value) {
        this.e.style.fontSize = value;
        return this;
    }
    setFontSizeRem(rem) {
        return this.setFontSize(`${rem}rem`);
    }
    fs(rem) {
        return this.setFontSizeRem(rem);
    }
    //////////////////////////////////////////////
    setBorderCollapse(value) {
        this.e.style.borderCollapse = value;
        return this;
    }
    //////////////////////////////////////////////
    setBorderSpacing(value) {
        this.e.style.borderSpacing = value;
        return this;
    }
    setBorderSpacingRem(rem) {
        this.e.style.borderSpacing = `${rem}rem`;
        return this;
    }
    //////////////////////////////////////////////
    get bred() {
        this.e.style.backgroundColor = "red";
        return this;
    }
    get bgreen() {
        this.e.style.backgroundColor = "green";
        return this;
    }
    get bblue() {
        this.e.style.backgroundColor = "blue";
        return this;
    }
    get blred() {
        this.e.style.backgroundColor = "lightred";
        return this;
    }
    get blgreen() {
        this.e.style.backgroundColor = "lightgreen";
        return this;
    }
    get blblue() {
        this.e.style.backgroundColor = "lightblue";
        return this;
    }
    get cred() {
        this.e.style.color = "red";
        return this;
    }
    get cgreen() {
        this.e.style.color = "green";
        return this;
    }
    get cblue() {
        this.e.style.color = "blue";
        return this;
    }
    //////////////////////////////////////////////
    removeAttribute(name) {
        this.e.removeAttribute(name);
        return this;
    }
    ra(name) {
        return this.removeAttribute(name);
    }
    //////////////////////////////////////////////
    setAttribute(name, value) {
        this.e.setAttribute(name, value);
        return this;
    }
    sa(name, value) {
        return this.setAttribute(name, value);
    }
    setAttributeN(name, n) {
        return this.setAttribute(name, `${n}`);
    }
    setType(type) {
        return this.setAttribute("type", type);
    }
    setValue(value) {
        return this.setAttribute("value", value);
    }
    getValue() {
        return this.e["value"];
    }
    //////////////////////////////////////////////
    addEventListener(type, listener) {
        this.e.addEventListener(type, listener);
        return this;
    }
    ae(type, listener) {
        return this.addEventListener(type, listener);
    }
}
class Div extends DomElement {
    constructor() {
        super("div");
    }
}
class LocalStorageDomStoreDriver {
    store(id, content) {
        localStorage.setItem(id, JSON.stringify(content));
    }
    retreive(id) {
        let content = localStorage.getItem(id);
        if (content == null)
            return {};
        return JSON.parse(content);
    }
}
class DomStore {
    constructor(id) {
        this.driver = new LocalStorageDomStoreDriver();
        this.id = id;
        this.retreive();
    }
    setDriver(driver) {
        this.driver = driver;
        this.retreive();
        return this;
    }
    store() {
        if (DEBUG)
            conslog(`domstore store ${this.id}`);
        this.driver.store(this.id, this.content);
    }
    retreive() {
        if (DEBUG)
            conslog(`domstore retreive ${this.id}`);
        this.content = this.driver.retreive(this.id);
    }
    setItem(key, value) {
        if (DEBUG)
            conslog(`domstore setitem ${this.id} ${key} ${value}`);
        this.content[key] = value;
        this.store();
    }
    getItem(key) {
        if (DEBUG)
            conslog(`domstore getitem ${this.id} ${key}`);
        return this.content[key];
    }
}
class Button extends DomElement {
    constructor(caption) {
        super("input");
        this.
            setType("button").
            setValue(caption).
            fs(FONT_SIZE);
    }
    get ok() {
        this.ac("okbutton");
        return this;
    }
    get cancel() {
        this.ac("cancelbutton");
        return this;
    }
    get delete() {
        this.ac("deletebutton");
        return this;
    }
    get info() {
        this.ac("infobutton");
        return this;
    }
    onClick(callback) {
        return this.addEventListener("click", callback);
    }
}
class Table extends DomElement {
    constructor() {
        super("table");
        this.
            setFontSizeRem(FONT_SIZE).
            c("domtable");
    }
    setBorderCollapseSpacingRem(rem) {
        return this.
            setBorderCollapse("separate").
            setBorderSpacingRem(rem);
    }
    bs(rem = 5) { return this.setBorderCollapseSpacingRem(rem); }
}
class Tr extends DomElement {
    constructor() {
        super("tr");
    }
}
class Td extends DomElement {
    constructor() {
        super("td");
        this.c("domtd");
    }
    //////////////////////////////////////////////
    setColspan(value) {
        this.setAttribute("colspan", value);
        return this;
    }
    setColspanRem(rem) {
        return this.setColspan(`${rem}rem`);
    }
    cs(rem) {
        return this.setColspanRem(rem);
    }
}
class TextInput extends DomElement {
    constructor(id, password = false) {
        super("input");
        this.history = [];
        this.index = 0;
        this.
            setType(password ? "password" : "text");
        this.id = id;
        this.fs(FONT_SIZE);
        this.ae("change", this.changeEventListener.bind(this));
        this.ae("input", this.changeEventListener.bind(this));
        this.fromStored;
        this.addEventListener("keyup", this.keyup.bind(this));
    }
    changeEventListener(e) {
        if (this.domstore != undefined) {
            let value = this.getText();
            this.domstore.setItem(this.domstorekey, value);
        }
    }
    onBind() {
        let value = this.domstore.getItem(this.domstorekey);
        if (value == undefined) {
            this.domstore.setItem(this.domstorekey, this.default);
            this.setText(this.default);
        }
        else {
            this.setText(value);
        }
    }
    fromJson(json) {
        this.history = json.history;
        this.index = json.index;
        return this;
    }
    get toJsonText() {
        return JSON.stringify(this, ["id", "history", "index"], 2);
    }
    getText() {
        return this.getValue();
    }
    caretToEnd() {
        let l = this.e.value.length;
        this.e.selectionStart = l;
        this.e.selectionEnd = l;
        return this;
    }
    setText(content) {
        this.setValue(content);
        return this.caretToEnd();
    }
    addToHistory(text) {
        this.history = this.history.filter(item => item != "");
        if (text == "")
            return this;
        let index = this.history.indexOf(text);
        if (index >= 0)
            this.index = index;
        else {
            this.history.push(text);
            this.index = this.history.length - 1;
        }
        return this.store;
    }
    clear() {
        this.setText("");
        return this;
    }
    getTextAndClear(addToHistory = true) {
        let text = this.getText();
        if (addToHistory)
            this.addToHistory(text);
        this.clear();
        return text;
    }
    setEnterCallback(entercallback) {
        this.entercallback = entercallback;
        return this;
    }
    moveIndex(dir) {
        if (this.history.length <= 0)
            return this;
        if (this.getText() != "")
            this.index += dir;
        if (this.index >= this.history.length)
            this.index = 0;
        else if (this.index < 0)
            this.index = this.history.length - 1;
        this.store;
        return this.setText(this.history[this.index]);
    }
    keyup(e) {
        //console.log(e.code)
        if (e.code == "Enter") {
            if (this.entercallback != undefined) {
                this.entercallback();
            }
        }
        if (e.code == "ArrowUp") {
            this.moveIndex(-1);
        }
        if (e.code == "ArrowDown") {
            this.moveIndex(1);
        }
        if (e.code == "Escape") {
            this.clear();
        }
    }
    get activate() {
        return this.focusLater;
    }
    resizeToWidth(width) {
        return this.w(width);
    }
}
class TextArea extends DomElement {
    constructor(id) {
        super("textarea");
        this.id = id;
        this.fs(FONT_SIZE);
    }
    getText() {
        return this.getValue();
    }
    setText(content) {
        this.h(content);
        return this;
    }
    clear() {
        this.setText("");
        return this;
    }
}
class Slider extends DomElement {
    constructor(id = null) {
        super("input");
        this.value = null;
        this.id = id;
        this.
            setType("range");
        this.fromStored;
        this.c("slider");
    }
    get toJsonText() {
        return JSON.stringify(this, ["id", "value"], 2);
    }
    fromJson(json) {
        this.value = json.value;
        return this;
    }
    setRange(min, max, value, force = false) {
        if ((this.value == null) || force)
            this.value = value;
        return this.
            setAttributeN("min", min).
            setAttributeN("max", max).
            setAttributeN("value", this.value);
    }
    changeHandler(e) {
        this.value = e.target.value;
        this.store;
        this.callback(this.value);
    }
    onChange(callback, doStartup = true) {
        this.callback = callback;
        if (doStartup)
            this.callback(this.value);
        return this.addEventListener("change", this.changeHandler.bind(this));
    }
}
class ComboOption extends DomElement {
    constructor(key, display) {
        super("option");
        this.key = key;
        this.display = display;
        this.setValue(key).h(this.display);
    }
}
class ComboBox extends DomElement {
    constructor(id) {
        super("select");
        this.options = [];
        this.selectedIndex = -1;
        this.optionsdata = [];
        this.id = id;
        this.fromStored;
    }
    clear() {
        this.options = [];
        this.selectedIndex = -1;
        this.store;
        return this;
    }
    addOptions(os) {
        os.map(o => this.options.push(o));
        this.store;
        return this;
    }
    selectByIndex(index) {
        if (index < 0)
            return this;
        if (this.options.length <= index) {
            this.selectedIndex = -1;
            this.selectedKey = null;
            return this;
        }
        this.selectedIndex = index;
        this.selectedKey = this.options[this.selectedIndex].key;
        for (let i = 0; i < this.options.length; i++) {
            this.options[i].ra("selected");
            if (i == this.selectedIndex) {
                this.options[i].sa("selected", "true");
                this.store;
            }
        }
        return this;
    }
    indexByKey(key) {
        for (let i = 0; i < this.options.length; i++) {
            if (this.options[i].key == key)
                return i;
        }
        return -1;
    }
    selectByKey(key) {
        return this.selectByIndex(this.indexByKey(key));
    }
    fromJson(json) {
        this.selectedKey = json.selectedKey;
        this.options = json.optionsdata.map((optiondata) => new ComboOption(optiondata.key, optiondata.display));
        return this;
    }
    get toJsonText() {
        this.optionsdata = this.options.map(option => ({
            key: option.key,
            display: option.display
        }));
        return JSON.stringify(this, ["id", "selectedKey", "optionsdata", "key", "display"], 2);
    }
    build() {
        this.h("").fs(FONT_SIZE).a(this.options);
        this.ae("change", this.change.bind(this));
        return this.selectByKey(this.selectedKey);
    }
    change(e) {
        let t = e.target;
        this.selectedKey = t.selectedOptions[0].value;
        this.selectedIndex = this.indexByKey(this.selectedKey);
        this.store;
        if (this.changeHandler != undefined)
            this.changeHandler(e);
    }
    onChange(handler) {
        this.changeHandler = handler;
        return this;
    }
}
var Layers;
(function (Layers) {
    let layers = [];
    let index = -1;
    function init() {
        Layers.body = document.querySelector("body");
        Layers.body.innerHTML = "";
        Layers.root = new Div().pr();
        Layers.body.appendChild(Layers.root.e);
    }
    Layers.init = init;
    function pushLayer() {
        let div = new Div().pa();
        index++;
        if (index >= layers.length) {
            layers.push(div);
            Layers.root.appendChild(div);
        }
        else {
            div = layers[index];
        }
        return div;
    }
    Layers.pushLayer = pushLayer;
    function pushCover() {
        let div = pushLayer();
        div.x.
            o(0, 0).
            setWidth(window.innerWidth + "px").
            setHeight(window.innerHeight + "px").
            c("coverdiv").
            fs(FONT_SIZE);
        return div;
    }
    Layers.pushCover = pushCover;
    function pushContent() {
        let div = pushLayer();
        div.x.
            r(0, 0, 0, 0).
            c("contentdiv").
            fs(FONT_SIZE);
        return div;
    }
    Layers.pushContent = pushContent;
    function popLayer() {
        if (index >= 0) {
            let current = layers[index];
            current.x.r(0, 0, 0, 0);
            index--;
            layers.pop();
        }
    }
    Layers.popLayer = popLayer;
})(Layers || (Layers = {}));
class DraggableWindow extends DomElement {
    constructor(id = null) {
        super("div");
        this.left = -1;
        this.top = -1;
        this.width = getCssFloatProperty("--draggablewindowwidth", 400);
        this.height = getCssFloatProperty("--draggablewindowheight", 200);
        this.titleBarHeight = getCssFloatProperty("--draggablewindowtitlebarheight", 25);
        this.closeBoxWidth = getCssFloatProperty("--draggablewindowcloseboxwidth", this.titleBarHeight);
        this.bottomBarHeight = getCssFloatProperty("--draggablewindowbottombarheight", 44);
        this.resizeBoxHeight = getCssFloatProperty("--draggablewindowresizeboxheight", this.titleBarHeight);
        this.resizeBoxWidth = getCssFloatProperty("--draggablewindowresizeboxwidth", this.resizeBoxHeight);
        this.minTop = getCssFloatProperty("--draggablewindowmintop", 10);
        this.maxTop = getCssFloatProperty("--draggablewindowmaxtop", 500);
        this.minLeft = getCssFloatProperty("--draggablewindowminleft", 10);
        this.maxLeft = getCssFloatProperty("--draggablewindowmaxleft", 1000);
        this.minWidth = getCssFloatProperty("--draggablewindowminwidth", 200);
        this.minHeight = getCssFloatProperty("--draggablewindowminheight", 100);
        this.dragPadding = getCssFloatProperty("--draggablewindowdragpadding", 50);
        this.containerPadding = getCssFloatProperty("--draggablewindowcontainerpadding", 5);
        this.resizeBoxPadding = (this.bottomBarHeight - this.resizeBoxHeight) / 2;
        this.buttonBarHeight = getCssFloatProperty("--draggablewindowbuttonbarheight", 36);
        this.buttonBarPadding = (this.bottomBarHeight - this.buttonBarHeight) / 2;
        this.buttonBarButtonHeight = getCssFloatProperty("--draggablewindowbuttonbarbuttonheight", 28);
        this.buttonBarButtonPadding = (this.buttonBarHeight - this.buttonBarButtonHeight) / 2;
        this.contentPadding = getCssFloatProperty("--draggablewindowcontentpadding", 3);
        this.contentHPadding = getCssFloatProperty("--draggablewindowcontenthpadding", 25);
        this.title = "Window";
        this.canClose = true;
        this.canResize = true;
        this.dragunderway = false;
        this.buttons = [];
        this.id = id;
        this.fromStored;
        this.
            pa();
        Layers.pushCover();
        this.layer = Layers.pushContent();
        this.layer.a([this]);
        this.buttons = [
            new Button("Ok").ok.onClick(this.okClicked.bind(this)),
            new Button("Cancel").cancel.onClick(this.cancelClicked.bind(this))
        ];
    }
    contentHeight() {
        return this.height - 2 * this.contentPadding - this.titleBarHeight - this.bottomBarHeight;
    }
    setCanClose(canClose) {
        this.canClose = canClose;
        return this;
    }
    setCanResize(canResize) {
        this.canResize = canResize;
        return this;
    }
    setInfo(info) {
        this.info = info;
        return this;
    }
    setContent(content) {
        this.content = content;
        return this;
    }
    setOkCallback(okcallback) {
        this.okcallback = okcallback;
        return this;
    }
    setCancelCallback(cancelcallback) {
        this.cancelcallback = cancelcallback;
        return this;
    }
    okClicked(e) {
        this.close();
        if (this.okcallback != undefined)
            this.okcallback();
    }
    cancelClicked(e) {
        this.close();
        if (this.cancelcallback != undefined)
            this.cancelcallback;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    middleLeft() {
        return (window.innerWidth / SCALE_FACTOR() - this.width) / 2;
    }
    middleTop() {
        return (window.innerHeight / SCALE_FACTOR() - this.height) / 2;
    }
    build() {
        if (this.left < this.minLeft)
            this.left = this.middleLeft();
        if (this.left > this.maxLeft)
            this.left = this.middleLeft();
        if (this.top < this.minTop)
            this.top = this.middleTop();
        if (this.top > this.maxTop)
            this.top = this.middleTop();
        if (this.width < this.minWidth)
            this.width = this.minWidth;
        if (this.height < this.minHeight)
            this.height = this.minHeight;
        this.layer.r(this.left - this.containerPadding, this.top - this.containerPadding, this.width + 2 * this.containerPadding, this.height + 2 * this.containerPadding);
        this.x.r(0, 0, this.width + 2 * this.containerPadding, this.height + 2 * this.containerPadding).
            burl("assets/images/backgrounds/wood.jpg").
            c("draggablewindow");
        this.titleBar = new Div().pa().
            sa("draggable", "true").
            r(0, 0, this.width, this.titleBarHeight).
            c("titlebar").
            ae("dragstart", this.windowdragstart.bind(this)).
            a([
            this.titleLabel = new Div().pa().o(6, 3).fs(FONT_SIZE * 1.2).h(this.title),
            this.dragBar = new Div().pa().r(0, 0, 0, 0).c("dragbar").
                ae("mousemove", this.windowmousemove.bind(this)).
                ae("mouseout", this.windowmouseout.bind(this)).
                ae("mouseup", this.windowmouseup.bind(this))
        ]);
        this.closeBox = new Div().pa().
            r(this.width - this.closeBoxWidth, 0, this.closeBoxWidth, this.titleBarHeight).
            c("closebox").
            ae("mousedown", this.closemousedown.bind(this));
        this.bottomBar = new Div().pa().
            r(0, this.height - this.bottomBarHeight, this.width, this.bottomBarHeight).
            c("bottombar");
        this.buttonBar = new Div().pa().
            r(2 * this.resizeBoxPadding + this.resizeBoxWidth, this.height - this.bottomBarHeight + this.buttonBarPadding, this.width - 4 * this.resizeBoxPadding - 2 * this.resizeBoxWidth - 2 * this.buttonBarButtonPadding, this.buttonBarHeight - 2 * this.buttonBarButtonPadding).
            p(this.buttonBarButtonPadding).
            c("buttonbar").a(this.buttons.map(button => button.
            he(this.buttonBarButtonHeight).
            ac("windowbutton"))).
            burl("assets/images/backgrounds/wood.jpg");
        this.resizeBox = new Div().pa().
            sa("draggable", "true").
            r(this.width - this.resizeBoxWidth - this.resizeBoxPadding, this.height - this.bottomBarHeight + this.resizeBoxPadding, this.resizeBoxWidth, this.resizeBoxHeight).
            ae("dragstart", this.resizedragstart.bind(this)).
            c("resizebox").a([
            this.resizeBar = new Div().pa().r(0, 0, 0, 0).c("resizebar").
                ae("mousemove", this.resizemousemove.bind(this)).
                ae("mouseout", this.resizemouseout.bind(this)).
                ae("mouseup", this.resizemouseup.bind(this))
        ]);
        this.contentTable = new Table().bs().pa().c("windowcontenttable").
            r(0, this.titleBarHeight + this.contentPadding, this.width, this.contentHeight());
        if (this.info != undefined)
            this.contentTable.a([
                new Tr().a([
                    this.infotd = new Td().h(this.info)
                ])
            ]);
        if (this.content != undefined)
            this.contentTable.a([
                new Tr().a([
                    this.contenttd = new Td().a([this.content])
                ])
            ]);
        if (!this.canClose)
            this.closeBox.z(0, 0);
        if (!this.canResize)
            this.resizeBox.z(0, 0);
        let container = new Div().pa().
            r(this.containerPadding, this.containerPadding, this.width, this.height).a([
            this.titleBar,
            this.closeBox,
            this.bottomBar,
            this.buttonBar,
            this.contentTable,
            this.resizeBox,
        ]);
        this.a([container]);
        if (this.content != undefined) {
            this.content.resizeToWidth(this.width - 2 * this.contentHPadding);
            this.content.activate;
        }
        return this;
    }
    get toJsonText() {
        return JSON.stringify(this, ["id", "left", "top", "width", "height"], 2);
    }
    fromJson(json) {
        this.left = json.left;
        this.top = json.top;
        this.width = json.width;
        this.height = json.height;
        return this;
    }
    resizedragstart(e) {
        e.preventDefault();
        let me = e;
        this.dragstart = new Vect(me.clientX, me.clientY);
        this.resizeBar.
            r(-this.dragPadding, -this.dragPadding, this.resizeBoxWidth + 2 * this.dragPadding, this.resizeBoxHeight + 2 * this.dragPadding);
        this.dragunderway = true;
    }
    resizemousemove(e) {
        let me = e;
        if (this.dragunderway) {
            this.dragd = new Vect(me.clientX, me.clientY).m(this.dragstart);
            this.dragdunsc = this.dragd.unsc();
            this.layer.z(this.width + this.dragdunsc.x, this.height + this.dragdunsc.y);
            this.resizeBox.o(this.width - this.resizeBoxWidth + this.dragdunsc.x, this.height - this.bottomBarHeight + this.dragdunsc.y);
        }
    }
    finalizeResize() {
        this.dragunderway = false;
        this.resizeBar.r(0, 0, 0, 0);
        this.width = this.width + this.dragdunsc.x;
        this.height = this.height + this.dragdunsc.y;
        this.store;
        this.build();
    }
    resizemouseout(e) {
        if (this.dragunderway) {
            this.finalizeResize();
        }
    }
    resizemouseup(e) {
        if (this.dragunderway) {
            this.finalizeResize();
        }
    }
    windowdragstart(e) {
        e.preventDefault();
        let me = e;
        this.dragstart = new Vect(me.clientX, me.clientY);
        this.dragBar.
            r(-this.dragPadding, -this.dragPadding, this.width + 2 * this.dragPadding, this.titleBarHeight + 2 * this.dragPadding);
        this.dragunderway = true;
    }
    windowmousemove(e) {
        let me = e;
        if (this.dragunderway) {
            this.dragd = new Vect(me.clientX, me.clientY).m(this.dragstart);
            this.dragdunsc = this.dragd.unsc();
            this.layer.o(this.left + this.dragdunsc.x, this.top + this.dragdunsc.y);
        }
    }
    finalizeDrag() {
        this.dragunderway = false;
        this.dragBar.r(0, 0, 0, 0);
        this.left = this.left + this.dragdunsc.x;
        this.top = this.top + this.dragdunsc.y;
        this.store;
        this.build();
    }
    windowmouseout(e) {
        if (this.dragunderway) {
            this.finalizeDrag();
        }
    }
    windowmouseup(e) {
        if (this.dragunderway) {
            this.finalizeDrag();
        }
    }
    close() {
        Layers.popLayer();
        Layers.popLayer();
    }
    closemousedown(e) {
        this.close();
    }
}
class TextInputWindow extends DraggableWindow {
    enterCallback() {
        this.close();
        if (this.okcallback != undefined)
            this.okcallback();
    }
    constructor(id) {
        super(id);
        this.content = this.textinput = new TextInput(this.id + "_textinput").
            setEnterCallback(this.enterCallback.bind(this)).
            ac("textinputwindowtextinput").
            fs(getCssFloatProperty("--textinputwindowtextinputfontrelsize", 1.25) * FONT_SIZE);
    }
}
class Tab {
    constructor(id, caption, node, scroll = true) {
        this.id = id;
        this.caption = caption;
        this.node = node;
        this.scroll = scroll;
    }
}
class Tabpane extends DomElement {
    constructor(id) {
        super("div");
        this.tabs = [];
        this.width = 600;
        this.height = 400;
        this.selectedIndex = -1;
        this.scroll = true;
        this.id = id;
        this.fromStored;
    }
    fromJson(json) {
        this.selectedIndex = json.selectedIndex;
        return this;
    }
    effDivwidth() {
        if (this.scroll)
            return this.divwidth - getGeneralScrollBarWidthRem();
        return this.divwidth - getGeneralWindowWidthCorrectionRem();
    }
    effDivheight() {
        if (this.scroll)
            return this.divheight - getGeneralScrollBarWidthRem();
        return this.divheight - getGeneralWindowHeightCorrectionRem();
    }
    getIndexById(id) {
        for (let i = 0; i < this.tabs.length; i++) {
            if (this.tabs[i].id == id)
                return i;
        }
        return -1;
    }
    selectTabByIndex(index) {
        this.selectedIndex = index;
        if (index >= 0) {
            let tab = this.tabs[index];
            let node = tab.node;
            this.scroll = tab.scroll;
            this.contentdiv.h("").a([node]).setOverflow(this.scroll ? "scroll" : "hidden");
            node.resizeToWidth(this.effDivwidth());
            node.resizeToHeight(this.effDivheight());
            node.activate;
        }
        for (let i = 0; i < this.tabs.length; i++) {
            this.tabs[i].td.c(i == this.selectedIndex ? "tabpanetabtdselected" : "tabpanetabtd");
        }
        return this.store;
    }
    selectTab(key) {
        return this.selectTabByIndex(this.getIndexById(key));
    }
    setTabs(tabs) {
        this.tabs = tabs;
        return this;
    }
    setW(width) {
        this.width = width;
        return this;
    }
    setH(height) {
        this.height = height;
        return this;
    }
    get toJsonText() {
        return JSON.stringify(this, ["id", "selectedIndex"], 2);
    }
    windowResizeHandler() {
        this.doSnapToWindow();
        return this.build();
    }
    doSnapToWindow() {
        this.width = getCorrectedWindowWidthRem();
        this.height = getCorrectedWindowHeightRem();
        return this;
    }
    resizeToWidth(width) {
        this.width = width;
        return this.build();
    }
    resizeToHeight(height) {
        this.height = height;
        return this.build();
    }
    divWidthCorrection() {
        return getCssFloatProperty("--tabpanedivwidthcorrection", 18);
    }
    divHeightCorrection() {
        return getCssFloatProperty("--tabpanedivheightcorrection", 28);
    }
    build() {
        if (this.snaptowindow) {
            this.doSnapToWindow();
        }
        let tabheight = 1.25 * FONT_SIZE;
        this.divwidth = this.width - this.divWidthCorrection();
        this.divheight = this.height - tabheight - this.divHeightCorrection();
        let table = new Table().bs().z(this.width, this.height).a([
            new Tr().a(this.tabs.map(tab => tab.td = new Td().
                he(tabheight).
                fs(FONT_SIZE).
                c("tabpanetabtd").
                h(tab.caption).
                addEventListener("mousedown", this.tabClicked.bind(this, tab)))),
            new Tr().a([
                new Td().
                    setAttributeN("colspan", this.tabs.length).
                    c("tabpanecontenttd").a([
                    this.contentdiv = new Div().
                        z(this.divwidth, this.divheight).
                        setOverflow(this.scroll ? "scroll" : "hidden")
                ])
            ]),
        ]);
        this.h("").a([
            table
        ]);
        return this.selectTabByIndex(this.selectedIndex);
    }
    tabClicked(tab, e) {
        this.selectTab(tab.id);
    }
}
class Logpane extends DomElement {
    constructor() {
        super("div");
        this.logger = new Log();
    }
    log(li) {
        this.logger.log(li);
        return this.build();
    }
    logText(text) {
        this.logger.log(new Logitem(text));
        return this.build();
    }
    createTable() {
        return new Table().bs(2).c("logtable").a(this.logger.items.map(item => new Tr().a([
            new Td().ac("logtd logtime log" + item.kind).a([new Div().fs(FONT_SIZE * 0.6).w(FONT_SIZE * 4).h(item.now.toLocaleTimeString())]),
            new Td().ac("logtd logcontent log" + item.kind).a([new Div().fs(FONT_SIZE * 0.7).w(2000).h(`<pre>${item.text}</pre>`)]),
        ])));
    }
    build() {
        this.x.a([
            this.createTable()
        ]);
        return this;
    }
}
class InputField {
    constructor(key, caption, _default, value = null) {
        this.key = key;
        this.caption = caption;
        this.default = _default;
        this.value = value;
    }
}
class Project extends DomElement {
    constructor() {
        super("div");
        this.fields = [];
    }
    setFields(fields) {
        this.fields = fields;
        return this;
    }
    setStore(domstore) {
        this.domstore = domstore;
        for (let field of this.fields) {
            let value = this.domstore.getItem(field.key);
            field.value = value != undefined ? value : field.default;
        }
        return this;
    }
    build() {
        this.x.a([
            new Table().bs().a(this.fields.map(field => new Tr().a([
                new Td().h(field.caption),
                new Td().a([
                    new TextInput(this.id + "_" + field.key).w(400).
                        bind(this.domstore, field.key, field.default)
                ])
            ])))
        ]);
        return this;
    }
}
class MongoDoc extends DomElement {
    constructor() {
        super("div");
        this.doc = {};
        this.
            fs(FONT_SIZE);
    }
    setDoc(doc) {
        this.doc = doc;
        return this;
    }
    setLoadCallback(loadcallback) {
        this.loadcallback = loadcallback;
        return this;
    }
    loadButtonClicked(e) {
        if (this.loadcallback != undefined)
            this.loadcallback(this.doc);
    }
    build() {
        let content = "";
        for (let key in this.doc) {
            let value = this.doc[key];
            content += `<span class="dockey">${key}</span>`;
            if ((typeof value == "string") && (value.length > 80))
                content += ` : <hr><pre>${value}</pre><hr>`;
            else
                content += ` = ${value}<hr>`;
        }
        this.x.ac("mongodocmaindiv").a([
            new Button("Load").onClick(this.loadButtonClicked.bind(this)),
            new Div().h(content)
        ]);
        return this;
    }
}
class MongoColl extends DomElement {
    constructor() {
        super("div");
        this.mdocs = [];
        this.
            fs(FONT_SIZE);
    }
    setLoadCallback(loadcallback) {
        this.loadcallback = loadcallback;
        return this;
    }
    setDocs(docs) {
        this.mdocs = docs.map(doc => new MongoDoc().setLoadCallback(this.loadcallback).setDoc(doc).build());
        return this;
    }
    build() {
        this.x.ac("mongocollmaindiv").a(this.mdocs);
        return this;
    }
}
DEBUG = false;
let AJAX_URL = `http://${document.location.host}/ajax`;
let WS_URL = `ws://${document.location.host}/ws`;
//localStorage.clear()
function socketTest() {
    let ws = new WebSocket(`${WS_URL}/?sri=${Math.floor(Math.random() * 1e9)}`);
    ws.onopen = function () {
        console.log("socket connected");
        ws.send("hi there ws server");
        setTimeout(function () {
            console.log("closing socket");
            ws.close(1000);
        }, 3000);
    };
}
socketTest();
function resetApp() {
    localStorage.clear();
    buildApp();
}
function clog(json) {
    conslog(JSON.stringify(json, null, 2));
}
function ajaxRequest(payload, callback) {
    console.log("submitting ajax request", payload);
    let body = JSON.stringify(payload);
    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    fetch(AJAX_URL, {
        method: 'POST',
        headers: headers,
        body: body
    }).then(response => {
        console.log("server responded to ajax request");
        return response.json();
    }).then(json => {
        console.log("server returned", json);
        callback(json);
    });
}
///////////////////////////////////////////////////////////
let intro;
let profile;
let tabpane;
function buildApp() {
    intro = new Div().h(`<hr>Chess playing interface of ACT Discord Server.<hr>` +
        `Under construction.`);
    profile = new Div();
    let log = new Logpane();
    tabpane = new Tabpane("maintabpane").
        setTabs([
        new Tab("intro", "Intro", intro),
        new Tab("profile", "Profile", profile),
        new Tab("log", "Log", log)
    ]).
        snapToWindow().
        build();
    log.log(new Logitem("application started", "info"));
    conslog = log.logText.bind(log);
    Layers.init();
    Layers.root.a([tabpane]);
}
buildApp();
DEBUG = true;
