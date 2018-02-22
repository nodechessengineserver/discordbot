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
function uniqueId() {
    return "" + Math.floor(Math.random() * 1e9);
}
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function toTwoDigits(n) {
    return (n < 10 ? "0" : "") + n;
}
function formatDurationAsClock(dur) {
    let msecsMod = dur % 1000;
    let secs = (dur - msecsMod) / 1000;
    let secsMod = secs % 60;
    let mins = (secs - secsMod) / 60;
    secs -= mins * 60;
    let minsMod = mins % 60;
    let hours = (mins - minsMod) / 60;
    mins -= hours * 60;
    return `${toTwoDigits(hours)}:${toTwoDigits(mins)}:${toTwoDigits(secs)}`;
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
let DOM_DEFINED = true;
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
    setPaddingTop(value) {
        this.e.style.paddingTop = value;
        return this;
    }
    setPaddingTopRem(rem) {
        return this.setPaddingTop(`${rem}rem`);
    }
    pt(rem) {
        return this.setPaddingTopRem(rem);
    }
    setMarginTop(value) {
        this.e.style.marginTop = value;
        return this;
    }
    setMarginTopRem(rem) {
        return this.setMarginTop(`${rem}rem`);
    }
    mt(rem) {
        return this.setMarginTopRem(rem);
    }
    setMarginLeft(value) {
        this.e.style.marginLeft = value;
        return this;
    }
    setMarginLeftRem(rem) {
        return this.setMarginLeft(`${rem}rem`);
    }
    ml(rem) {
        return this.setMarginLeftRem(rem);
    }
    setDisplay(value) {
        this.e.style.display = value;
        return this;
    }
    ib() {
        return this.setDisplay("inline-block");
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
    bcol(value) {
        return this.setBackgroundColor(value);
    }
    setColor(value) {
        this.e.style.color = value;
        return this;
    }
    col(value) {
        return this.setColor(value);
    }
    fontStyle(value) {
        this.e.style.fontStyle = value;
        return this;
    }
    it() {
        return this.fontStyle("italic");
    }
    textDecoration(value) {
        this.e.style.textDecoration = value;
        return this;
    }
    ul() {
        return this.textDecoration("underline");
    }
    setVerticalAlign(value) {
        this.e.style.verticalAlign = value;
        return this;
    }
    va(value) {
        return this.setVerticalAlign(value);
    }
    setTextAlgin(value) {
        this.e.style.textAlign = value;
        return this;
    }
    ta(value) {
        return this.setTextAlgin(value);
    }
    setOpacity(value) {
        this.e.style.opacity = value;
        return this;
    }
    op(value) {
        return this.setOpacity("" + value);
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
        this.e["value"] = value;
        return this;
    }
    getValue() {
        return this.e["value"];
    }
    //////////////////////////////////////////////
    getPx(pxstr) {
        return parseInt(pxstr.replace("px", ""));
    }
    getTopPx() {
        return this.getPx(this.e.style.top);
    }
    getLeftPx() {
        return this.getPx(this.e.style.left);
    }
    topPx(px) {
        this.e.style.top = px + "px";
        return this;
    }
    leftPx(px) {
        this.e.style.left = px + "px";
        return this;
    }
    zIndexNumber(z) {
        this.e.style.zIndex = "" + z;
        return this;
    }
    cp() {
        this.e.style.cursor = "pointer";
        return this;
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
class Span extends DomElement {
    constructor() {
        super("span");
    }
}
class Label extends DomElement {
    constructor() {
        super("label");
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
    cs(cs) {
        return this.setColspan("" + cs);
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
        Layers.body = document.querySelector("#root");
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
class AckInfoWindow extends DraggableWindow {
    constructor(content) {
        super("ackinfo");
        this.content = new Div().ac("ackinfotext").h(content);
        this.setTitle("Info");
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
    setCaptionByKey(id, caption) {
        let index = this.getIndexById(id);
        if (index >= 0) {
            this.tabs[index].td.h(caption);
        }
        return this;
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
var Glicko;
(function (Glicko) {
    const VERBOSE = false;
    ///////////////////////////////////////////
    // Constants and utility functions
    Glicko.RATING0 = 1500;
    Glicko.RD0 = 350;
    const TYPICAL_RD = 50;
    const TIME_CONSTANT = 1000;
    const RATING_DIFFERENCE_DIVISOR = 400;
    const MIN_RATING = 100;
    const MAX_RATING = 3500;
    const PI = Math.PI;
    const Q = Math.log(10) / RATING_DIFFERENCE_DIVISOR;
    const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
    const C2 = (sq(Glicko.RD0) - sq(TYPICAL_RD)) / MONTH_MS;
    function sqrt(x) { return Math.sqrt(x); }
    function sq(x) { return x * x; }
    function pow10(x) { return Math.pow(10, x); }
    function min(x, y) { return Math.min(x, y); }
    ///////////////////////////////////////////
    // Glick sub calculations
    function g(rdi) {
        return 1.0 / sqrt(1.0 + 3.0 * sq(Q * rdi / PI));
    }
    function E(r, ri, rdi) {
        return 1.0 / (1.0 + pow10(g(rdi) * (r - ri) / -RATING_DIFFERENCE_DIVISOR));
    }
    function d2(r, ri, rdi) {
        return 1.0 / (sq(Q) * sq(g(rdi)) * E(r, ri, rdi) * (1 - E(r, ri, rdi)));
    }
    function r(r, rd, ri, rdi, si) {
        let newr = r + Q / ((1 / sq(rd) + (1 / d2(r, ri, rdi)))) * (si - E(r, ri, rdi));
        if (newr < MIN_RATING)
            newr = MIN_RATING;
        if (newr > MAX_RATING)
            newr = MAX_RATING;
        return newr;
    }
    function getrdt(rd, t) {
        return min(sqrt(sq(rd) + C2 * t), Glicko.RD0);
    }
    function rd(r, rd, ri, rdi) {
        return sqrt(1 / ((1 / sq(rd)) + (1 / d2(r, ri, rdi))));
    }
    function calc(g, gi, si) {
        const now = new Date().getTime();
        const rdt = getrdt(g.rd, now - g.lastrated);
        if (VERBOSE) {
            console.log("***********************************");
            console.log("Glicko calculation");
            console.log("***********************************");
            console.log("Player ", g);
            console.log("Opponent ", gi);
            console.log("***********************************");
            console.log("Result ", si);
            console.log("Expected result ", E(g.rating, gi.rating, gi.rd));
            console.log("***********************************");
        }
        const result = new GlickoData();
        result.rating = r(g.rating, rdt, gi.rating, gi.rd, si),
            result.rd = rd(g.rating, rdt, gi.rating, gi.rd),
            result.lastrated = now;
        if (VERBOSE) {
            console.log("New rating ", result);
            console.log("***********************************");
        }
        return result;
    }
    Glicko.calc = calc;
})(Glicko || (Glicko = {}));
let EPOCH = 1517443200000; // 2018-2-1
let CHAT_CAPACITY = 100;
function createUserFromJson(json) {
    if (json == undefined)
        return new User();
    if (json.isBot)
        return new BotUser().fromJson(json);
    if (json.isSystem)
        return new SystemUser().fromJson(json);
    return new User().fromJson(json);
}
class GlickoData {
    constructor() {
        this.rating = Glicko.RATING0;
        this.rd = Glicko.RD0;
        this.lastrated = new Date().getTime();
    }
    ratingF() { return "" + Math.floor(this.rating); }
    rdF() { return "" + Math.floor(this.rd); }
    toJson() {
        return ({
            rating: this.rating,
            rd: this.rd,
            lastrated: this.lastrated
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.rating != undefined)
            this.rating = json.rating;
        if (json.rd != undefined)
            this.rd = json.rd;
        if (json.lastrated != undefined)
            this.lastrated = json.lastrated;
        return this;
    }
}
class User {
    constructor() {
        this.username = "";
        this.cookie = "";
        this.isBot = false;
        this.isSystem = false;
        this.registeredAt = new Date().getTime();
        this.lastSeenAt = new Date().getTime();
        this.glicko = new GlickoData();
    }
    clone() {
        return createUserFromJson(this.toJson());
    }
    empty() {
        return this.username == "";
    }
    e(u) {
        return this.username == u.username;
    }
    smartName() {
        return this.username == "" ? "Anonymous" : this.username;
    }
    smartNameHtml() {
        return `<span class="${this.empty() ? "modeluser anonuser" : "modeluser"}">${this.smartName()}</span>`;
    }
    toJson(secure = false) {
        let json = ({
            username: this.username,
            isBot: this.isBot,
            isSystem: this.isSystem,
            registeredAt: this.registeredAt,
            lastSeenAt: this.lastSeenAt,
            glicko: this.glicko.toJson()
        });
        // don't send user cookie to client
        if (!secure) {
            json.cookie = this.cookie;
        }
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.username != undefined)
            this.username = json.username;
        if (json.cookie != undefined)
            this.cookie = json.cookie;
        if (json.isBot != undefined)
            this.isBot = json.isBot;
        if (json.isSystem != undefined)
            this.isSystem = json.isSystem;
        if (json.registeredAt != undefined)
            this.registeredAt = json.registeredAt;
        if (json.lastSeenAt != undefined)
            this.lastSeenAt = json.lastSeenAt;
        if (json.glicko != undefined)
            this.glicko = new GlickoData().fromJson(json.glicko);
        return this;
    }
}
class SystemUser extends User {
    constructor() {
        super();
        this.username = "#System";
        this.isSystem = true;
    }
    smartNameHtml() {
        return `<span class="modeluser systemuser">system</span>`;
    }
}
class BotUser extends User {
    constructor() {
        super();
        this.username = "#Bot";
        this.isBot = true;
    }
    smartNameHtml() {
        return `<span class="modeluser botuser">Bot</span>`;
    }
}
class UserList {
    constructor() {
        this.users = {};
        this.cookies = {};
    }
    toJson(secure = false) {
        let usersJson = {};
        for (let username in this.users) {
            usersJson[username] = this.users[username].toJson(secure);
        }
        return usersJson;
    }
    fromJson(json) {
        this.users = {};
        this.cookies = {};
        if (json == undefined)
            return this;
        for (let username in json) {
            let userJson = json[username];
            let u = createUserFromJson(userJson);
            this.users[u.username] = u;
            this.cookies[u.cookie] = u;
        }
        return this;
    }
    setUser(u) {
        this.users[u.username] = u;
        this.cookies[u.cookie] = u;
        return u;
    }
    upsertUser(u) {
        let oldu = this.users[u.username];
        if (oldu == undefined) {
            return this.setUser(u);
        }
        let cookie = oldu.cookie;
        let uclone = u.clone();
        uclone.cookie = cookie;
        return this.setUser(uclone);
    }
    getByCookie(cookie) {
        return this.cookies[cookie];
    }
    getByUsername(username) {
        return this.users[username];
    }
    iterate(callback) {
        for (let username in this.users) {
            let u = this.users[username];
            callback(u);
        }
    }
}
class ChatItem {
    constructor(user = new User(), text = "") {
        this.user = new User();
        this.text = "";
        this.time = new Date().getTime();
        this.user = user;
        this.text = text;
        this.time = new Date().getTime();
    }
    toJson() {
        return ({
            user: this.user.toJson(),
            text: this.text,
            time: this.time
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.user != undefined)
            this.user = createUserFromJson(json.user);
        if (json.text != undefined)
            this.text = json.text;
        if (json.time != undefined)
            this.time = json.time;
        return this;
    }
}
class Chat {
    constructor() {
        this.items = [];
    }
    add(chi) {
        this.items.unshift(chi);
    }
    asHtml() {
        return this.items.map(item => `<span class="chattime">${new Date(item.time).toLocaleString()}</span> ${item.user.smartNameHtml()} : <span class="chattext">${item.text}</span>`).join("<br>");
    }
    toJson() {
        return (this.items.map((item) => item.toJson()));
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json != undefined) {
            this.items = json.map((itemJson) => new ChatItem().fromJson(itemJson));
        }
        return this;
    }
}
let loggedUser = new User();
let THREEFOLD_REPETITION = 3;
let FIFTYMOVE_RULE = 50;
let WHITE = 1;
let BLACK = 0;
let NO_COL = -1;
function INV_COLOR(color) {
    if (color == NO_COL)
        return NO_COL;
    return color == WHITE ? BLACK : WHITE;
}
let EMPTY = "-";
let PAWN = "p";
let KNIGHT = "n";
let BISHOP = "b";
let ROOK = "r";
let QUEEN = "q";
let KING = "k";
let IS_PIECE = { "p": true, "n": true, "b": true, "r": true, "q": true, "k": true };
let ALL_PIECES = Object.keys(IS_PIECE);
let ALL_CHECK_PIECES = ["p", "n", "b", "r", "q"];
let IS_PROM_PIECE = { "n": true, "b": true, "r": true, "q": true };
let ALL_PROMOTION_PIECES = Object.keys(IS_PROM_PIECE);
let MOVE_LETTER_TO_TURN = { "w": WHITE, "b": BLACK };
let VARIANT_PROPERTIES = {
    "promoatomic": {
        DISPLAY: "Promotion Atomic",
        BOARD_WIDTH: 8,
        BOARD_HEIGHT: 8,
        START_FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
};
let DEFAULT_VARIANT = "promoatomic";
let ONE_SECOND = 1000;
let ONE_MINUTE = 60 * ONE_SECOND;
class TimeControl {
    constructor(time = ONE_MINUTE * 5, inc = ONE_SECOND * 8) {
        this.time = ONE_MINUTE * 5;
        this.inc = ONE_SECOND * 8;
        this.time = time;
        this.inc = inc;
    }
}
class Piece {
    constructor(kind = EMPTY, color = NO_COL) {
        this.kind = kind;
        this.color = color;
    }
    empty() { return this.kind == EMPTY; }
    inv() { return new Piece(this.kind, INV_COLOR(this.color)); }
    e(p) {
        return (this.kind == p.kind) && (this.color == p.color);
    }
}
class Square {
    constructor(f, r) {
        this.f = f;
        this.r = r;
    }
    p(sq) {
        return new Square(this.f + sq.f, this.r + sq.r);
    }
    e(sq) {
        return (sq.f == this.f) && (sq.r == this.r);
    }
    invalid() { return (this.f < 0) || (this.r < 0); }
}
const INVALID_SQUARE = new Square(-1, -1);
class Move {
    constructor(fromSq, toSq, promPiece = new Piece()) {
        this.fromSq = fromSq;
        this.toSq = toSq;
        this.promPiece = promPiece;
    }
    e(m) {
        if (!m.fromSq.e(this.fromSq))
            return false;
        if (!m.toSq.e(this.toSq))
            return false;
        return m.promPiece.kind == this.promPiece.kind;
    }
    invalid() {
        return this.fromSq.invalid() || this.toSq.invalid();
    }
}
const INVALID_MOVE = new Move(INVALID_SQUARE, INVALID_SQUARE);
class CastlingRight {
    constructor(color, kingFrom, kingTo, rookFrom, rookTo, emptySqs, fenLetter) {
        this.color = color;
        this.kingFrom = kingFrom;
        this.kingTo = kingTo;
        this.rookFrom = rookFrom;
        this.rookTo = rookTo;
        this.emptySqs = emptySqs;
        this.fenLetter = fenLetter;
    }
}
const CASTLING_RIGHTS = [
    new CastlingRight(WHITE, new Square(4, 7), new Square(6, 7), new Square(7, 7), new Square(5, 7), [new Square(5, 7), new Square(6, 7)], "K"),
    new CastlingRight(WHITE, new Square(4, 7), new Square(2, 7), new Square(0, 7), new Square(3, 7), [new Square(3, 7), new Square(2, 7), new Square(1, 7)], "Q"), new CastlingRight(BLACK, new Square(4, 0), new Square(6, 0), new Square(7, 0), new Square(5, 0), [new Square(5, 0), new Square(6, 0)], "k"),
    new CastlingRight(BLACK, new Square(4, 0), new Square(2, 0), new Square(0, 0), new Square(3, 0), [new Square(3, 0), new Square(2, 0), new Square(1, 0)], "q")
];
class PlayerInfo {
    constructor(valid = true) {
        this.u = new User();
        this.color = BLACK;
        this.time = 0;
        this.showTime = 0;
        this.seatedAt = new Date().getTime();
        this.startedThinkingAt = new Date().getTime();
        this.canPlay = true;
        this.canOfferDraw = false;
        this.canAcceptDraw = false;
        this.canResign = false;
        this.canStand = false;
        this.valid = true;
        this.valid = valid;
    }
    colorName() {
        return this.color == WHITE ? "white" : "black";
    }
    toJson() {
        let json = ({
            u: this.u.toJson(true),
            color: this.color,
            time: this.time,
            showTime: this.showTime,
            seatedAt: this.seatedAt,
            startedThinkingAt: this.startedThinkingAt,
            canPlay: this.canPlay,
            canOfferDraw: this.canOfferDraw,
            canAcceptDraw: this.canAcceptDraw,
            canResign: this.canResign,
            canStand: this.canStand
        });
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        if (json.color != undefined)
            this.color = json.color;
        if (json.time != undefined)
            this.time = json.time;
        if (json.showTime != undefined)
            this.showTime = json.showTime;
        if (json.seatedAt != undefined)
            this.seatedAt = json.seatedAt;
        if (json.startedThinkingAt != undefined)
            this.startedThinkingAt = json.startedThinkingAt;
        if (json.canPlay != undefined)
            this.canPlay = json.canPlay;
        if (json.canOfferDraw != undefined)
            this.canOfferDraw = json.canOfferDraw;
        if (json.canAcceptDraw != undefined)
            this.canAcceptDraw = json.canAcceptDraw;
        if (json.canResign != undefined)
            this.canResign = json.canResign;
        if (json.canStand != undefined)
            this.canStand = json.canStand;
        return this;
    }
    sitPlayer(u) {
        this.u = u;
        this.canAcceptDraw = false;
        this.canOfferDraw = false;
        this.canPlay = false;
        this.canResign = false;
        this.canStand = true;
        this.seatedAt = new Date().getTime();
        return this;
    }
    standPlayer() {
        this.u = new User();
        this.canAcceptDraw = false;
        this.canOfferDraw = false;
        this.canPlay = true;
        this.canResign = false;
        this.canStand = false;
        return this;
    }
}
class PlayersInfo {
    constructor() {
        this.playersinfo = [
            new PlayerInfo().fromJson({ color: BLACK }),
            new PlayerInfo().fromJson({ color: WHITE })
        ];
    }
    numSeated() {
        let num = 0;
        for (let pi of this.playersinfo)
            if (!pi.u.empty())
                num++;
        return num;
    }
    noneSeated() { return this.numSeated() == 0; }
    someSeated() { return this.numSeated() == 1; }
    allSeated() { return this.numSeated() == 2; }
    toJson() {
        let json = this.playersinfo.map(pi => pi.toJson());
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.playersinfo = json.map((piJson) => new PlayerInfo().fromJson(piJson));
        return this;
    }
    getByColor(color) {
        for (let pi of this.playersinfo) {
            if (pi.color == color)
                return pi;
        }
        return new PlayerInfo(false);
    }
    getByUser(u) {
        for (let pi of this.playersinfo) {
            if (pi.u.e(u))
                return pi;
        }
        return new PlayerInfo(false);
    }
    sitPlayer(color, u) {
        for (let pi of this.playersinfo) {
            if (pi.u.username == u.username)
                pi.standPlayer();
        }
        let pi = this.getByColor(color);
        pi.sitPlayer(u);
        return pi;
    }
    standPlayer(color) {
        for (let pi of this.playersinfo) {
            if (pi.color == color) {
                pi.standPlayer();
                return pi;
            }
        }
        return new PlayerInfo();
    }
    standPlayers() {
        this.iterate((pi) => pi.standPlayer());
        return this;
    }
    iterate(iterfunc) {
        for (let pi of this.playersinfo)
            iterfunc(pi);
    }
}
class RatingCalculation {
    constructor() {
        this.username = "";
        this.oldRating = 1500;
        this.newRating = 1500;
    }
    ratingDifferenceF() {
        let diff = Math.floor(this.newRating - this.oldRating);
        return (diff > 0 ? "+" : "") + diff;
    }
    oldRatingF() { return "" + Math.floor(this.oldRating); }
    newRatingF() { return "" + Math.floor(this.newRating); }
    toJson() {
        return ({
            username: this.username,
            oldRating: this.oldRating,
            newRating: this.newRating
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.username != undefined)
            this.username = json.username;
        if (json.oldRating != undefined)
            this.oldRating = json.oldRating;
        if (json.newRating != undefined)
            this.newRating = json.newRating;
        return this;
    }
}
class GameStatus {
    constructor() {
        // game status
        this.score = "*";
        this.scoreReason = "";
        this.started = false;
        // termination by rules
        this.isStaleMate = false;
        this.isMate = false;
        this.isFiftyMoveRule = false;
        this.isThreeFoldRepetition = false;
        // termination by player
        this.isResigned = false;
        this.isDrawAgreed = false;
        this.isFlagged = false;
        // players info    
        this.playersinfo = new PlayersInfo();
        // rating calc
        this.ratingCalcWhite = new RatingCalculation();
        this.ratingCalcBlack = new RatingCalculation();
    }
    toJson() {
        let json = ({
            score: this.score,
            scoreReason: this.scoreReason,
            started: this.started,
            isStaleMate: this.isStaleMate,
            isMate: this.isMate,
            isFiftyMoveRule: this.isFiftyMoveRule,
            isThreeFoldRepetition: this.isThreeFoldRepetition,
            isResigned: this.isResigned,
            isDrawAgreed: this.isDrawAgreed,
            isFlagged: this.isFlagged,
            playersinfo: this.playersinfo.toJson(),
            ratingCalcWhite: this.ratingCalcWhite.toJson(),
            ratingCalcBlack: this.ratingCalcBlack.toJson()
        });
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.score = json.score;
        this.scoreReason = json.scoreReason;
        this.started = json.started;
        this.isStaleMate = json.isStaleMate;
        this.isMate = json.isMate;
        this.isFiftyMoveRule = json.isFiftyMoveRule;
        this.isThreeFoldRepetition = json.isThreeFoldRepetition;
        this.isResigned = json.isResigned;
        this.isDrawAgreed = json.isDrawAgreed;
        this.isFlagged = json.isFlagged;
        this.playersinfo = new PlayersInfo().fromJson(json.playersinfo);
        this.ratingCalcWhite = new RatingCalculation().fromJson(json.ratingCalcWhite);
        this.ratingCalcBlack = new RatingCalculation().fromJson(json.ratingCalcBlack);
        return this;
    }
}
class GameNode {
    constructor() {
        this.status = new GameStatus();
        this.genAlgeb = "";
        this.fen = "";
        this.tfen = "";
    }
    toJson() {
        return ({
            status: this.status.toJson(),
            genAlgeb: this.genAlgeb,
            fen: this.fen,
            tfen: this.tfen
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.status = new GameStatus().fromJson(json.status);
        this.genAlgeb = json.genAlgeb;
        this.fen = json.fen;
        this.tfen = json.tfen;
        return this;
    }
}
class ChangeLog {
    constructor() {
        this.kind = "";
        this.reason = "";
        this.pi = new PlayerInfo();
        this.u = new User();
    }
    clear() {
        this.kind = "";
        this.reason = "";
    }
    toJson() {
        return ({
            kind: this.kind,
            reason: this.reason,
            pi: this.pi.toJson(),
            u: this.u.toJson()
        });
    }
    fromJson(json) {
        if (json.kind != undefined)
            this.kind = json.kind;
        if (json.reason != undefined)
            this.reason = json.reason;
        if (json.pi != undefined)
            this.pi = new PlayerInfo().fromJson(json.pi);
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        return this;
    }
}
class Board {
    constructor(variant = DEFAULT_VARIANT) {
        this.timecontrol = new TimeControl();
        this.rights = [true, true, true, true];
        this.hist = [];
        this.test = false;
        this.plms = [];
        this.lms = [];
        this.debug = false;
        this.gameStatus = new GameStatus();
        this.genAlgeb = "";
        this.fullmoveNumber = 1;
        this.halfmoveClock = 0;
        this.epSquare = INVALID_SQUARE;
        this.changeLog = new ChangeLog();
        this.savedWhite = new User();
        this.savedBlack = new User();
        this.variant = variant;
        this.PROPS = VARIANT_PROPERTIES[variant];
        this.BOARD_WIDTH = this.PROPS.BOARD_WIDTH;
        this.BOARD_HEIGHT = this.PROPS.BOARD_HEIGHT;
        this.BOARD_SIZE = this.BOARD_WIDTH * this.BOARD_HEIGHT;
        this.START_FEN = this.PROPS.START_FEN;
        this.rep = new Array(this.BOARD_SIZE);
        this.reset();
    }
    reset() {
        for (let i = 0; i < this.BOARD_SIZE; i++) {
            this.rep[i] = new Piece();
        }
        this.turn = WHITE;
        this.rights = [false, false, false, false];
        this.epSquare = INVALID_SQUARE;
        this.fullmoveNumber = 1;
        this.halfmoveClock = 0;
        this.hist = [];
    }
    setTest(test) {
        this.test = test;
        return this;
    }
    frOk(f, r) {
        if ((f < 0) || (f >= this.BOARD_WIDTH))
            return false;
        if ((r < 0) || (r >= this.BOARD_HEIGHT))
            return false;
        return true;
    }
    setFR(f, r, p = new Piece()) {
        if (this.frOk(f, r))
            this.rep[r * 8 + f] = p;
    }
    setSq(sq, p = new Piece()) { this.setFR(sq.f, sq.r, p); }
    getFR(f, r) {
        if (!this.frOk(f, r))
            return new Piece();
        return this.rep[r * 8 + f];
    }
    setFromFenChecked(fen = this.START_FEN, clearHist = true) {
        let b = new Board(this.variant);
        let parts = fen.split(" ");
        if (parts.length != 6)
            return false;
        let rawfen = parts[0];
        let ranks = rawfen.split("/");
        if (ranks.length != 8)
            return false;
        for (let r = 0; r < 8; r++) {
            let pieces = ranks[r].split("");
            let f = 0;
            for (let p of pieces) {
                if ((p >= "1") && (p <= "8")) {
                    for (let pc = 0; pc < parseInt(p); pc++) {
                        b.setFR(f++, r);
                    }
                }
                else {
                    let kind = p.toLowerCase();
                    if (!IS_PIECE[kind])
                        return false;
                    b.setFR(f++, r, new Piece(kind, p != kind ? WHITE : BLACK));
                }
            }
            if (f != this.BOARD_WIDTH)
                return false;
        }
        let turnfen = parts[1];
        let turn = MOVE_LETTER_TO_TURN[turnfen];
        if (turn == undefined)
            return false;
        let castlefen = parts[2];
        b.rights = [false, false, false, false];
        if (castlefen != "-")
            for (let i = 0; i < 4; i++) {
                if ("KQkq".indexOf(castlefen.charAt(i)) < 0)
                    return false;
                if (castlefen.indexOf(CASTLING_RIGHTS[i].fenLetter) >= 0) {
                    b.rights[i] = true;
                }
            }
        let epfen = parts[3];
        if (epfen == "-") {
            b.epSquare = INVALID_SQUARE;
        }
        else {
            let sq = this.squareFromAlgeb(epfen);
            if (sq.invalid())
                return false;
            b.epSquare = sq;
        }
        b.turn = turn;
        let halfmoveFen = parts[4];
        let hmc = parseInt(halfmoveFen);
        if (isNaN(hmc))
            return false;
        if (hmc < 0)
            return false;
        b.halfmoveClock = hmc;
        let fullmoveFen = parts[5];
        let fmn = parseInt(fullmoveFen);
        if (isNaN(fmn))
            return false;
        if (fmn < 1)
            return false;
        b.fullmoveNumber = fmn;
        this.rep = b.rep;
        this.turn = b.turn;
        this.rights = b.rights;
        this.epSquare = b.epSquare;
        this.fullmoveNumber = b.fullmoveNumber;
        this.halfmoveClock = b.halfmoveClock;
        if (!this.test) {
            if (clearHist)
                this.hist = [this.toGameNode()];
        }
        this.posChanged();
        return true;
    }
    setFromFen(fen = this.START_FEN, clearHist = true) {
        this.setFromFenChecked(fen, clearHist);
        return this;
    }
    pawnDir(color) {
        return color == WHITE ? new Square(0, -1) : new Square(0, 1);
    }
    sqOk(sq) { return this.frOk(sq.f, sq.r); }
    getSq(sq) {
        if (!this.sqOk)
            return new Piece();
        return this.getFR(sq.f, sq.r);
    }
    isSqEmpty(sq) {
        if (!this.sqOk(sq))
            return false;
        return this.getSq(sq).empty();
    }
    isSqOpp(sq, color) {
        if (!this.sqOk(sq))
            return false;
        let col = this.getSq(sq).color;
        if (col == NO_COL)
            return false;
        return col != color;
    }
    isSqSame(sq, color) {
        if (!this.sqOk(sq))
            return false;
        let col = this.getSq(sq).color;
        if (col == NO_COL)
            return false;
        return col == color;
    }
    pawnFromStart(sq, color) {
        return color == WHITE ? this.BOARD_HEIGHT - 1 - sq.r : sq.r;
    }
    pawnFromProm(sq, color) {
        return this.BOARD_HEIGHT - 1 - this.pawnFromStart(sq, color);
    }
    posChanged() {
        if (!this.test) {
            this.genLegalMoves();
        }
        if (this.posChangedCallback != undefined) {
            this.posChangedCallback();
        }
    }
    newGame() {
        this.timecontrol = new TimeControl();
        this.gameStatus.score = "*";
        this.gameStatus.scoreReason = "";
        this.gameStatus.isStaleMate = false;
        this.gameStatus.isMate = false;
        this.gameStatus.isFiftyMoveRule = false;
        this.gameStatus.isThreeFoldRepetition = false;
        this.gameStatus.isResigned = false;
        this.gameStatus.isDrawAgreed = false;
        this.gameStatus.isFlagged = false;
        this.gameStatus.playersinfo.iterate((pi) => {
            pi.time = this.timecontrol.time;
        });
        this.setFromFen();
        this.genAlgeb = "";
        return this;
    }
    startGame() {
        this.gameStatus.started = true;
        this.gameStatus.playersinfo.iterate((pi) => {
            pi.canStand = false;
            pi.canResign = true;
            pi.canOfferDraw = true;
        });
        this.actualizeHistory();
    }
    obtainStatus() {
        if (this.isTerminated())
            return;
        this.gameStatus.isStaleMate = false;
        this.gameStatus.isMate = false;
        if (this.gameStatus.isResigned || this.gameStatus.isFlagged) {
            let reason = this.gameStatus.isResigned ? "resigned" : "flagged";
            if (this.turn == WHITE) {
                this.gameStatus.score = "0-1";
                this.gameStatus.scoreReason = "white " + reason;
            }
            else {
                this.gameStatus.score = "1-0";
                this.gameStatus.scoreReason = "black " + reason;
            }
        }
        else if (this.gameStatus.isDrawAgreed) {
            this.gameStatus.score = "1/2-1/2";
            this.gameStatus.scoreReason = "draw agreed";
        }
        else if (this.lms.length <= 0) {
            if (this.isInCheck(this.turn)) {
                this.gameStatus.isMate = true;
                if (this.turn == WHITE) {
                    this.gameStatus.score = "0-1";
                    this.gameStatus.scoreReason = "white mated";
                }
                else {
                    this.gameStatus.score = "1-0";
                    this.gameStatus.scoreReason = "black mated";
                }
            }
            else {
                this.gameStatus.isStaleMate = true;
                this.gameStatus.score = "1/2-1/2";
                this.gameStatus.scoreReason = "stalemate";
            }
        }
        else if (this.isDrawByThreefoldRepetition()) {
            this.gameStatus.isThreeFoldRepetition = true;
            this.gameStatus.score = "1/2-1/2";
            this.gameStatus.scoreReason = "threefold repetition";
        }
        else if (this.halfmoveClock >= (FIFTYMOVE_RULE * 2)) {
            this.gameStatus.isFiftyMoveRule = true;
            this.gameStatus.score = "1/2-1/2";
            this.gameStatus.scoreReason = "fifty move rule";
        }
    }
    isDrawByThreefoldRepetition() {
        let tfens = {};
        for (let gn of this.hist) {
            let tfen = gn.tfen;
            if (tfens[tfen] == undefined) {
                tfens[tfen] = 1;
            }
            else {
                let cnt = tfens[tfen];
                cnt++;
                tfens[tfen] = cnt;
                if (cnt >= THREEFOLD_REPETITION) {
                    return true;
                }
            }
        }
        return false;
    }
    isTerminated() {
        return this.gameStatus.isStaleMate ||
            this.gameStatus.isMate ||
            this.gameStatus.isFiftyMoveRule ||
            this.gameStatus.isThreeFoldRepetition ||
            this.gameStatus.isResigned ||
            this.gameStatus.isDrawAgreed ||
            this.gameStatus.isFlagged;
    }
    genLegalMoves() {
        this.genPseudoLegalMoves();
        this.lms = [];
        for (let m of this.plms) {
            let b = new Board().setTest(true).setFromFen(this.reportFen());
            b.makeMove(m, false);
            if (!b.isInCheck(this.turn)) {
                this.lms.push(m);
            }
        }
        for (let i = 0; i < 4; i++) {
            let cr = CASTLING_RIGHTS[i];
            if ((cr.color == this.turn) && (this.rights[i])) {
                if ((cr.emptySqs.filter(sq => !this.isSqEmpty(sq))).length <= 0) {
                    if (!(this.isSquareInCheck(cr.kingFrom, this.turn) ||
                        this.isSquareInCheck(cr.kingTo, this.turn) ||
                        this.isSquareInCheck(cr.rookTo, this.turn))) {
                        let cm = new Move(cr.kingFrom, cr.kingTo);
                        this.lms.push(cm);
                        let cmpn = new Move(cr.kingFrom, cr.kingTo, new Piece(KNIGHT, this.turn));
                        this.lms.push(cmpn);
                        let cmpq = new Move(cr.kingFrom, cr.kingTo, new Piece(QUEEN, this.turn));
                        this.lms.push(cmpq);
                    }
                }
            }
        }
        // obtain status
        this.obtainStatus();
    }
    genPseudoLegalMoves() {
        this.plms = [];
        for (let f = 0; f < this.BOARD_WIDTH; f++) {
            for (let r = 0; r < this.BOARD_HEIGHT; r++) {
                let p = this.getFR(f, r);
                if (p.color == this.turn) {
                    let pms = this.pseudoLegalMovesForPieceAt(p, new Square(f, r));
                    for (let m of pms) {
                        this.plms.push(m);
                    }
                }
            }
        }
        let ams = [];
        for (let m of this.plms) {
            let fp = this.getSq(m.fromSq);
            if (IS_PROM_PIECE[fp.kind]) {
                if (fp.kind == BISHOP) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(KNIGHT)));
                }
                if (fp.kind == KNIGHT) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(BISHOP)));
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(ROOK)));
                }
                if (fp.kind == ROOK) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(KNIGHT)));
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(QUEEN)));
                }
                if (fp.kind == QUEEN) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(ROOK)));
                }
            }
        }
        for (let m of ams) {
            this.plms.push(m);
        }
    }
    squareToAlgeb(sq) {
        return `${String.fromCharCode(sq.f + "a".charCodeAt(0))}${this.BOARD_HEIGHT - sq.r}`;
    }
    moveToAlgeb(m) {
        let raw = `${this.squareToAlgeb(m.fromSq)}${this.squareToAlgeb(m.toSq)}`;
        return `${raw}${m.promPiece.empty() ? "" : m.promPiece.kind}`;
    }
    pseudoLegalMovesForPieceAt(p, sq) {
        let moves = [];
        if (p.kind == PAWN) {
            let pdir = this.pawnDir(p.color);
            let pushOne = sq.p(pdir);
            let promdist = this.pawnFromProm(sq, p.color);
            let isprom = promdist == 1;
            let targetKinds = ["p"];
            if (isprom)
                targetKinds = ALL_PROMOTION_PIECES;
            function createPawnMoves(targetSq) {
                for (let targetKind of targetKinds) {
                    let m = new Move(sq, targetSq);
                    if (isprom)
                        m.promPiece = new Piece(targetKind);
                    moves.push(m);
                }
            }
            if (this.isSqEmpty(pushOne)) {
                createPawnMoves(pushOne);
                let pushTwo = pushOne.p(pdir);
                if (this.isSqEmpty(pushTwo) && (this.pawnFromStart(sq, p.color) == 1)) {
                    let m = new Move(sq, pushTwo);
                    moves.push(m);
                }
            }
            for (let df = -1; df <= 1; df += 2) {
                let csq = sq.p(pdir).p(new Square(df, 0));
                if (this.isSqOpp(csq, p.color)) {
                    createPawnMoves(csq);
                }
                else if (csq.e(this.epSquare)) {
                    let m = new Move(sq, csq);
                    moves.push(m);
                }
            }
        }
        else {
            for (let df = -2; df <= 2; df++) {
                for (let dr = -2; dr <= 2; dr++) {
                    let multAbs = Math.abs(df * dr);
                    let sumAbs = Math.abs(df) + Math.abs(dr);
                    let ok = true;
                    let f = sq.f;
                    let r = sq.r;
                    do {
                        let knightOk = (multAbs == 2);
                        let bishopOk = (multAbs == 1);
                        let rookOk = ((multAbs == 0) && (sumAbs == 1));
                        let pieceOk = (knightOk && (p.kind == KNIGHT)) ||
                            (bishopOk && (p.kind == BISHOP)) ||
                            (rookOk && (p.kind == ROOK)) ||
                            ((rookOk || bishopOk) && ((p.kind == QUEEN) || (p.kind == KING)));
                        if (pieceOk) {
                            f += df;
                            r += dr;
                            if (this.frOk(f, r)) {
                                let tp = this.getFR(f, r);
                                if (tp.color == p.color) {
                                    ok = false;
                                }
                                else {
                                    let m = new Move(sq, new Square(f, r));
                                    moves.push(m);
                                    if (!tp.empty())
                                        ok = false;
                                    if ((p.kind == KING) || (p.kind == KNIGHT))
                                        ok = false;
                                }
                            }
                            else {
                                ok = false;
                            }
                        }
                        else {
                            ok = false;
                        }
                    } while (ok);
                }
            }
        }
        return moves;
    }
    legalAlgebMoves() {
        return this.lms.map(m => this.moveToAlgeb(m));
    }
    isMoveLegal(m) {
        let flms = this.lms.filter((tm) => tm.e(m));
        return flms.length > 0;
    }
    clearCastlingRights(color) {
        if (color == WHITE) {
            this.rights[0] = false;
            this.rights[1] = false;
        }
        else {
            this.rights[2] = false;
            this.rights[3] = false;
        }
    }
    makeMove(m, check = true) {
        if (check)
            if (!this.isMoveLegal(m))
                return false;
        if (this.isTerminated())
            return false;
        // calculate some useful values
        let algeb = this.moveToAlgeb(m);
        let fSq = m.fromSq;
        let tSq = m.toSq;
        let deltaR = tSq.r - fSq.r;
        let deltaF = tSq.f - fSq.f;
        let fp = this.getSq(fSq);
        let tp = this.getSq(tSq);
        let cr = this.getCastlingRight(m);
        let isCastling = (cr != undefined);
        let normal = tp.empty();
        let playerToMoveInfo = this.gameStatus.playersinfo.getByColor(this.turn);
        let nextPlayerToMoveInfo = this.gameStatus.playersinfo.getByColor(INV_COLOR(this.turn));
        // remove from piece
        this.setSq(fSq);
        // ep capture
        if ((fp.kind == PAWN) && (m.toSq.e(this.epSquare))) {
            normal = false;
            let epCaptSq = this.epSquare.p(new Square(0, -deltaR));
            this.setSq(epCaptSq);
        }
        // set target piece
        if (normal) {
            if (m.promPiece.empty() || isCastling) {
                this.setSq(tSq, fp);
            }
            else {
                this.setSq(tSq, new Piece(m.promPiece.kind, fp.color));
            }
        }
        else {
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    let testSq = tSq.p(new Square(df, dr));
                    if (this.sqOk(testSq)) {
                        let tp = this.getSq(testSq);
                        if (tp.kind != PAWN)
                            this.setSq(testSq);
                    }
                }
            }
            this.setSq(tSq);
        }
        // castling
        if (cr != undefined) {
            this.setSq(cr.rookFrom);
            this.setSq(cr.rookTo, new Piece(ROOK, this.turn));
            if (!m.promPiece.empty()) {
                this.setSq(cr.rookTo, new Piece(m.promPiece.kind, this.turn));
            }
        }
        // update castling rights
        if (fp.kind == KING)
            this.clearCastlingRights(this.turn);
        if (this.isExploded(WHITE))
            this.clearCastlingRights(WHITE);
        if (this.isExploded(BLACK))
            this.clearCastlingRights(BLACK);
        for (let i = 0; i < 4; i++) {
            let cr = CASTLING_RIGHTS[i];
            if (cr.color == this.turn) {
                if (fSq.e(cr.rookFrom) || tSq.e(cr.rookFrom))
                    this.rights[i] = false;
                if (this.isSqEmpty(cr.rookFrom))
                    this.rights[i] = false;
            }
        }
        // advance turn
        this.turn = INV_COLOR(this.turn);
        // advance fullmove number
        if (this.turn == WHITE)
            this.fullmoveNumber++;
        // advance halfmove clock
        this.halfmoveClock++;
        if (fp.kind == PAWN)
            this.halfmoveClock = 0;
        if (tp.kind != EMPTY)
            this.halfmoveClock = 0;
        // set ep square
        this.epSquare = INVALID_SQUARE;
        if ((fp.kind == PAWN) && (Math.abs(deltaR) == 2)) {
            let epsq = new Square(m.fromSq.f, m.fromSq.r + (deltaR / 2));
            this.epSquare = epsq;
        }
        // remove draw offer
        if (playerToMoveInfo.canAcceptDraw) {
            playerToMoveInfo.canAcceptDraw = false;
            playerToMoveInfo.canOfferDraw = true;
            nextPlayerToMoveInfo.canOfferDraw = true;
        }
        // update history        
        if (!this.test) {
            this.genAlgeb = algeb;
            this.hist.push(this.toGameNode(algeb));
        }
        // position changed callback
        this.posChanged();
        return true;
    }
    actualizeHistory() {
        this.hist[this.hist.length - 1] = this.toGameNode(this.genAlgeb);
        return this;
    }
    getCurrentGameNode() {
        return this.hist[this.hist.length - 1];
    }
    del() {
        if (this.hist.length > 1) {
            this.hist.pop();
            this.fromGameNode(this.getCurrentGameNode());
        }
    }
    reportTruncFen() {
        let fen = this.reportFen();
        let parts = fen.split(" ");
        let tfen = parts.slice(0, 4).join(" ");
        return tfen;
    }
    reportFen() {
        let fen = "";
        for (let r = 0; r < this.BOARD_HEIGHT; r++) {
            let acc = 0;
            for (let f = 0; f < this.BOARD_WIDTH; f++) {
                let p = this.getFR(f, r);
                if (p.empty()) {
                    acc++;
                }
                else {
                    if (acc) {
                        fen += acc;
                        acc = 0;
                    }
                    fen += p.color == WHITE ? p.kind.toUpperCase() : p.kind;
                }
            }
            if (acc) {
                fen += acc;
                acc = 0;
            }
            if (r < (this.BOARD_HEIGHT - 1))
                fen += "/";
        }
        let crs = "";
        for (let i = 0; i < 4; i++) {
            if (this.rights[i])
                crs += CASTLING_RIGHTS[i].fenLetter;
        }
        if (crs == "")
            crs = "-";
        return `${fen} ${(this.turn == WHITE ? "w" : "b")} ${crs} ${this.epSquare.invalid() ? "-" : this.squareToAlgeb(this.epSquare)} ${this.halfmoveClock} ${this.fullmoveNumber}`;
    }
    squareFromAlgeb(algeb) {
        if (algeb.length != 2)
            return INVALID_SQUARE;
        let fc = algeb.charAt(0);
        let f = fc.charCodeAt(0) - "a".charCodeAt(0);
        let r = this.BOARD_HEIGHT - parseInt(algeb.charAt(1));
        if (isNaN(r))
            return INVALID_SQUARE;
        if (this.frOk(f, r))
            return new Square(f, r);
        return INVALID_SQUARE;
    }
    moveFromAlgeb(algeb) {
        if (algeb.length < 4)
            return INVALID_MOVE;
        if (algeb.length > 5)
            return INVALID_MOVE;
        let fromSq = this.squareFromAlgeb(algeb.substring(0, 2));
        if (!this.sqOk(fromSq))
            return INVALID_MOVE;
        let toSq = this.squareFromAlgeb(algeb.substring(2, 4));
        if (!this.sqOk(toSq))
            return INVALID_MOVE;
        let rm = new Move(fromSq, toSq);
        if (algeb.length == 4)
            return rm;
        let pk = algeb.charAt(4);
        if (!IS_PROM_PIECE[pk])
            return INVALID_MOVE;
        rm.promPiece = new Piece(pk, NO_COL);
        return rm;
    }
    makeAlgebMove(algeb) {
        let m = this.moveFromAlgeb(algeb);
        if (m.invalid())
            return false;
        return this.makeMove(m);
    }
    setPosChangedCallback(posChangedCallback) {
        this.posChangedCallback = posChangedCallback;
        return this;
    }
    isAlgebMoveLegal(algeb) {
        return this.isMoveLegal(this.moveFromAlgeb(algeb));
    }
    isSquareAttackedByPiece(sq, p) {
        let tp = p.inv();
        if (p.kind == PAWN) {
            let pdir = this.pawnDir(tp.color);
            for (let df = -1; df <= 1; df += 2) {
                let tsq = sq.p(new Square(df, pdir.r));
                if (this.sqOk(tsq)) {
                    let ap = this.getSq(tsq);
                    if (ap.e(p))
                        return true;
                }
            }
        }
        else {
            let plms = this.pseudoLegalMovesForPieceAt(tp, sq);
            for (let m of plms) {
                let ap = this.getSq(m.toSq);
                if (ap.e(p))
                    return true;
            }
        }
        return false;
    }
    isSquareAttackedByColor(sq, color) {
        for (let kind of ALL_CHECK_PIECES) {
            if (this.isSquareAttackedByPiece(sq, new Piece(kind, color)))
                return true;
        }
        return false;
    }
    isSquareInCheck(sq, color) {
        return this.isSquareAttackedByColor(sq, INV_COLOR(color));
    }
    whereIsKing(color) {
        for (let f = 0; f < this.BOARD_WIDTH; f++) {
            for (let r = 0; r < this.BOARD_HEIGHT; r++) {
                let p = this.getFR(f, r);
                if ((p.kind == KING) && (p.color == color)) {
                    return new Square(f, r);
                }
            }
        }
        return INVALID_SQUARE;
    }
    kingsAdjacent() {
        let ww = this.whereIsKing(WHITE);
        let wb = this.whereIsKing(BLACK);
        if (ww.invalid())
            return false;
        if (wb.invalid())
            return false;
        return this.isSquareAttackedByPiece(ww, new Piece(KING, BLACK));
    }
    isExploded(color) {
        let wk = this.whereIsKing(color);
        if (wk.invalid())
            return true;
        return false;
    }
    isInCheck(color = this.turn) {
        // adjacent kings - no check
        if (this.kingsAdjacent())
            return false;
        // I'm exploded - always bad
        if (this.isExploded(color))
            return true;
        // I'm not exploded, opponent exploded - no check there
        if (this.isExploded(INV_COLOR(color)))
            return false;
        // none of the above, fall back to regular check
        return this.isSquareInCheck(this.whereIsKing(color), color);
    }
    getCastlingRight(m) {
        let fp = this.getSq(m.fromSq);
        if (fp.kind != KING)
            return undefined;
        let deltaF = m.toSq.f - m.fromSq.f;
        if (Math.abs(deltaF) < 2)
            return undefined;
        let index = CASTLING_RIGHTS.findIndex(cr => cr.kingFrom.e(m.fromSq));
        if (index < 0)
            return undefined; // this should not happen
        return CASTLING_RIGHTS[index];
    }
    isMoveCapture(m) {
        if (!this.getSq(m.toSq).empty())
            return true;
        return false;
    }
    toGameNode(genAlgeb = "") {
        let fen = this.reportFen();
        let tfen = this.reportTruncFen();
        let gn = new GameNode();
        gn.fen = fen;
        gn.tfen = tfen;
        gn.genAlgeb = genAlgeb;
        gn.status = new GameStatus().fromJson(this.gameStatus.toJson());
        return gn;
    }
    fromGameNode(gn, clearHist = false) {
        let fen = gn.fen;
        this.gameStatus = gn.status;
        this.genAlgeb = gn.genAlgeb;
        // set from fen has to be called last so that the callback has correct status
        this.setFromFen(fen, clearHist);
        return this;
    }
    sitPlayer(color, u) {
        let pi = this.gameStatus.playersinfo.sitPlayer(color, u);
        this.actualizeHistory();
        this.changeLog.kind = "sitplayer";
        this.changeLog.pi = pi;
        return this;
    }
    standPlayer(color) {
        let pi = this.gameStatus.playersinfo.getByColor(color);
        if (pi.u.empty())
            return this;
        let u = pi.u.clone();
        this.gameStatus.playersinfo.standPlayer(color);
        this.actualizeHistory();
        this.changeLog.kind = "standplayer";
        this.changeLog.u = u;
        return this;
    }
    resignPlayer(color) {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.isResigned = true;
        this.gameStatus.started = false;
        if (color == WHITE) {
            this.gameStatus.score = "0-1";
            this.gameStatus.scoreReason = "white resigned";
        }
        else {
            this.gameStatus.score = "1-0";
            this.gameStatus.scoreReason = "black resigned";
        }
        this.actualizeHistory();
        return this;
    }
    terminateByRules() {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.started = false;
        this.actualizeHistory();
    }
    flagPlayer(color) {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.isFlagged = true;
        this.gameStatus.started = false;
        if (color == WHITE) {
            this.gameStatus.score = "0-1";
            this.gameStatus.scoreReason = "white flagged";
        }
        else {
            this.gameStatus.score = "1-0";
            this.gameStatus.scoreReason = "black flagged";
        }
        this.actualizeHistory();
        return this;
    }
    iteratePlayersinfo(iterfunc) {
        this.gameStatus.playersinfo.iterate(iterfunc);
    }
    clearChangeLog() { this.changeLog.clear(); }
    noneSeated() { return this.gameStatus.playersinfo.noneSeated(); }
    someSeated() { return this.gameStatus.playersinfo.someSeated(); }
    allSeated() { return this.gameStatus.playersinfo.allSeated(); }
    makeRandomMove() {
        let n = this.lms.length;
        if (n > 0) {
            let i = Math.floor(Math.random() * n);
            if (i >= n)
                i = 0;
            this.makeMove(this.lms[i]);
            return true;
        }
        return false;
    }
    actualizeShowTime() {
        this.gameStatus.playersinfo.iterate((pi) => {
            if ((this.turn != pi.color) || (!this.gameStatus.started)) {
                pi.showTime = pi.time;
            }
            else {
                pi.showTime = pi.time - (new Date().getTime() - pi.startedThinkingAt);
                if (pi.showTime < 0)
                    pi.showTime = 0;
            }
        });
        return this.actualizeHistory();
    }
    gameScore() {
        let score = 0.5;
        if (this.gameStatus.score == "1-0")
            score = 1;
        else if (this.gameStatus.score == "0-1")
            score = 0;
        else if (this.gameStatus.score == "1/2-1/2")
            score = 0.5;
        return score;
    }
    savePlayers() {
        let pw = this.gameStatus.playersinfo.getByColor(WHITE).u;
        let pb = this.gameStatus.playersinfo.getByColor(BLACK).u;
        this.savedWhite = pw.clone();
        this.savedBlack = pb.clone();
    }
    calculateRatings() {
        let pw = this.savedWhite;
        let pb = this.savedBlack;
        let rcw = new RatingCalculation();
        rcw.username = pw.username;
        rcw.oldRating = pw.glicko.rating;
        let rcb = new RatingCalculation();
        rcb.username = pb.username;
        rcb.oldRating = pb.glicko.rating;
        let s = this.gameScore();
        let pwng = Glicko.calc(pw.glicko, pb.glicko, s);
        let pbng = Glicko.calc(pb.glicko, pw.glicko, 1 - s);
        if (!((pw.isBot) || (pb.isBot))) {
            pw.glicko = pwng;
            pb.glicko = pbng;
            rcw.newRating = pwng.rating;
            rcb.newRating = pbng.rating;
        }
        this.changeLog.kind = "ratingscalculated";
        this.gameStatus.ratingCalcWhite = rcw;
        this.gameStatus.ratingCalcBlack = rcb;
        console.log("rating calcs", rcw, rcb);
        this.actualizeHistory();
        this.timecontrol = new TimeControl();
        return [pw, pb];
    }
    offerDraw(color) {
        let offer = this.gameStatus.playersinfo.getByColor(color);
        let accept = this.gameStatus.playersinfo.getByColor(INV_COLOR(color));
        offer.canOfferDraw = false;
        accept.canAcceptDraw = true;
        accept.canOfferDraw = false;
        this.actualizeHistory();
    }
    drawByAgreement() {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.isDrawAgreed = true;
        this.gameStatus.started = false;
        this.gameStatus.score = "1/2-1/2";
        this.gameStatus.scoreReason = "draw agreed";
        this.actualizeHistory();
        return this;
    }
    getPlayer(color) {
        return this.gameStatus.playersinfo.getByColor(color).u;
    }
}
class GuiPlayerInfo extends DomElement {
    constructor() {
        super("div");
        this.PLAYER_WIDTH = 275;
        this.PLAYER_HEIGHT = 30;
        this.BUTTONS_HEIGHT = 25;
        this.TIME_WIDTH = 80;
        this.pi = new PlayerInfo();
        this.color = BLACK;
    }
    setPlayerInfo(pi) {
        this.pi = pi;
        return this.build();
    }
    setPlayColor(color) { this.color = color; return this; }
    setPlayCallback(playCallback) { this.playCallback = playCallback; return this; }
    setPlayBotCallback(playBotCallback) { this.playBotCallback = playBotCallback; return this; }
    setOfferDrawCallback(offerDrawCallback) { this.offerDrawCallback = offerDrawCallback; return this; }
    setAcceptDrawCallback(acceptDrawCallback) { this.acceptDrawCallback = acceptDrawCallback; return this; }
    setResignCallback(resignCallback) { this.resignCallback = resignCallback; return this; }
    setStandCallback(standCallback) { this.standCallback = standCallback; return this; }
    playClicked() { if (this.playCallback != undefined)
        this.playCallback(this); }
    playBotClicked() { if (this.playBotCallback != undefined)
        this.playBotCallback(this); }
    offerDrawClicked() { if (this.offerDrawCallback != undefined)
        this.offerDrawCallback(this); }
    acceptDrawClicked() { if (this.acceptDrawCallback != undefined)
        this.acceptDrawCallback(this); }
    resignClicked() { if (this.resignCallback != undefined)
        this.resignCallback(this); }
    standClicked() { if (this.standCallback != undefined)
        this.standCallback(this); }
    build(addClockClass = undefined) {
        let buttons = [];
        let authok = this.pi.u.e(loggedUser);
        let botok = this.pi.u.isBot;
        let authbotok = authok || botok;
        if (this.pi.canPlay)
            buttons.push(new Button("Play").onClick(this.playClicked.bind(this)));
        if (this.pi.canPlay)
            buttons.push(new Button("Play Bot").onClick(this.playBotClicked.bind(this)));
        if (this.pi.canOfferDraw && authbotok)
            buttons.push(new Button("Offer draw").onClick(this.offerDrawClicked.bind(this)));
        if (this.pi.canAcceptDraw && authbotok)
            buttons.push(new Button("Accept draw").onClick(this.acceptDrawClicked.bind(this)));
        if (this.pi.canResign && authbotok)
            buttons.push(new Button("Resign").onClick(this.resignClicked.bind(this)));
        if (this.pi.canStand && authbotok)
            buttons.push(new Button("Stand").onClick(this.standClicked.bind(this)));
        let clockclass = "gameclock";
        if (addClockClass != undefined)
            clockclass = clockclass + " " + addClockClass;
        this.x.a([
            new Table().bs().a([
                new Tr().a([
                    new Td().a([
                        new Div().
                            z(this.PLAYER_WIDTH, this.PLAYER_HEIGHT).
                            h(`${this.pi.u.username != "" ? `${this.pi.u.smartNameHtml()} ( ${this.pi.u.glicko.ratingF()} )` : "?"}`)
                    ]),
                    new Td().a([
                        new Div().z(this.TIME_WIDTH, this.PLAYER_HEIGHT).
                            ac(clockclass).
                            h(`${formatDurationAsClock(this.pi.showTime)}`)
                    ])
                ]),
                new Tr().a([
                    new Td().cs(2).a([
                        new Div().
                            z(this.PLAYER_WIDTH, this.BUTTONS_HEIGHT).a(buttons)
                    ])
                ])
            ])
        ]);
        return this;
    }
}
let PIECE_TO_STYLE = { "p": "pawn", "n": "knight", "b": "bishop", "r": "rook", "q": "queen", "k": "king" };
let COLOR_TO_STYLE = { 0: "black", 1: "white" };
class GuiBoard extends DomElement {
    constructor() {
        super("div");
        this.MARGIN = 5;
        this.RESULT_MARGIN = 20;
        this.SQUARE_SIZE = 50;
        this.PIECE_MARGIN = 4;
        this.PIECE_SIZE = this.SQUARE_SIZE - 2 * this.PIECE_MARGIN;
        this.pDivs = [];
        this.promMode = false;
        this.proms = [];
        this.flip = 0;
        this.b = new Board().newGame().setPosChangedCallback(this.posChanged.bind(this));
    }
    boardWidth() { return this.b.BOARD_WIDTH * this.SQUARE_SIZE; }
    resultWidth() { return this.boardWidth() - 2 * this.RESULT_MARGIN; }
    boardHeight() { return this.b.BOARD_HEIGHT * this.SQUARE_SIZE; }
    resultHeight() { return this.boardHeight() - 2 * this.RESULT_MARGIN; }
    totalBoardWidth() { return this.boardWidth() + 2 * this.MARGIN; }
    totalBoardHeight() { return this.boardHeight() + 2 * this.MARGIN; }
    setPosChangedCallback(posChangedCallback) {
        this.posChangedCallback = posChangedCallback;
        return this;
    }
    posChanged() {
        this.build();
        if (this.posChangedCallback != undefined) {
            this.posChangedCallback();
        }
    }
    setVariant(variant = DEFAULT_VARIANT) {
        this.b = new Board(variant).setFromFen();
        return this.build();
    }
    createPDiv(p, f, r) {
        let pDiv = new Div().pa().r(f * this.SQUARE_SIZE + this.PIECE_MARGIN, r * this.SQUARE_SIZE + this.PIECE_MARGIN, this.PIECE_SIZE, this.PIECE_SIZE);
        if (!p.empty()) {
            let cn = PIECE_TO_STYLE[p.kind] + " " + COLOR_TO_STYLE[p.color];
            pDiv.ac(cn);
        }
        return pDiv;
    }
    drawBoardArrow(algeb) {
        let m = this.b.moveFromAlgeb(algeb);
        let fSqR = this.rotateSquare(m.fromSq, this.flip);
        let tSqR = this.rotateSquare(m.toSq, this.flip);
        let fSqV = new Vect(fSqR.f * this.SQUARE_SIZE, fSqR.r * this.SQUARE_SIZE).p(this.HALF_SQUARE_SIZE_VECT());
        let tSqV = new Vect(tSqR.f * this.SQUARE_SIZE, tSqR.r * this.SQUARE_SIZE).p(this.HALF_SQUARE_SIZE_VECT());
        let arrow = new Arrow(fSqV, tSqV, {
            constantwidth: 8
        });
        let aDiv = new Div().pa().op(0.75).o(arrow.svgorig.x, arrow.svgorig.y).
            h(arrow.svg);
        this.boardArrowDiv.x.a([aDiv]);
    }
    build() {
        let term = this.b.isTerminated();
        this.x.pr().z(this.totalBoardWidth(), this.totalBoardHeight()).
            burl("assets/images/backgrounds/wood.jpg");
        this.boardSquareDiv = new Div().pa().r(this.MARGIN, this.MARGIN, this.boardWidth(), this.boardHeight()).
            burl("assets/images/backgrounds/wood.jpg");
        this.boardArrowDiv = new Div().pa().r(this.MARGIN, this.MARGIN, this.boardWidth(), this.boardHeight());
        this.boardPieceDiv = new Div().pa().r(this.MARGIN, this.MARGIN, this.boardWidth(), this.boardHeight());
        this.boardResultDiv = new Div().pa().r(this.MARGIN + this.RESULT_MARGIN, this.MARGIN + this.RESULT_MARGIN, this.resultWidth(), this.resultHeight()).ac("boardresult");
        this.pDivs = [];
        for (let nr = 0; nr < this.b.BOARD_WIDTH; nr++) {
            for (let nf = 0; nf < this.b.BOARD_HEIGHT; nf++) {
                let sq = new Square(nf, nr);
                let rotSq = this.rotateSquare(sq, this.flip);
                let f = rotSq.f;
                let r = rotSq.r;
                let sqDiv = new Div().pa().r(f * this.SQUARE_SIZE, r * this.SQUARE_SIZE, this.SQUARE_SIZE, this.SQUARE_SIZE);
                sqDiv.e.style.opacity = "0.1";
                sqDiv.e.style.backgroundColor = ((r + f) % 2) == 0 ? "#fff" : "#777";
                let p = this.b.getFR(nf, nr);
                let pDiv = this.createPDiv(p, f, r);
                pDiv.e.setAttribute("draggable", "true");
                // don't allow drag in prom mode, or if game has terminated
                if ((!this.promMode) && (!term))
                    pDiv.addEventListener("dragstart", this.piecedragstart.bind(this, sq, pDiv));
                let dopush = true;
                if (this.promMode) {
                    if (sq.e(this.promMove.fromSq))
                        dopush = false;
                    if (this.promCr != undefined)
                        dopush = dopush && (!sq.e(this.promCr.rookFrom));
                }
                this.boardSquareDiv.a([sqDiv]);
                if (dopush)
                    this.boardPieceDiv.a([pDiv]);
                if (this.promMode) {
                    if (this.promCr != undefined) {
                        let kingToSqFlipped = this.rotateSquare(this.promCr.kingTo, this.flip);
                        let kDiv = this.createPDiv(new Piece(KING, this.b.turn), kingToSqFlipped.f, kingToSqFlipped.r);
                        this.boardPieceDiv.a([kDiv]);
                    }
                    let promToSq = this.promMove.toSq;
                    if (this.promCr != undefined) {
                        promToSq = this.promCr.rookTo;
                    }
                    let promToSqFlipped = this.rotateSquare(promToSq, this.flip);
                    let f = promToSqFlipped.f;
                    let r = promToSqFlipped.r;
                    let dir = r < 4 ? 1 : -1;
                    let i;
                    for (i = 0; i < this.proms.length; i++) {
                        let promSqDiv = new Div().pa().r(f * this.SQUARE_SIZE, (r + i * dir) * this.SQUARE_SIZE, this.SQUARE_SIZE, this.SQUARE_SIZE).bcol("#ff7").zIndexNumber(200);
                        let pkind = this.proms[i];
                        let cn = PIECE_TO_STYLE[pkind] + " " + COLOR_TO_STYLE[this.b.turn];
                        let promPDiv = new Div().pa().r(f * this.SQUARE_SIZE + this.PIECE_MARGIN, (r + i * dir) * this.SQUARE_SIZE + this.PIECE_MARGIN, this.PIECE_SIZE, this.PIECE_SIZE).cp().ac(cn).addEventListener("mousedown", this.promDivClicked.bind(this, pkind)).zIndexNumber(200);
                        this.boardPieceDiv.a([promSqDiv]);
                        this.boardPieceDiv.a([promPDiv]);
                    }
                    let cancelDiv = new Div().pa().cp().r(f * this.SQUARE_SIZE, (r + i * dir) * this.SQUARE_SIZE, this.SQUARE_SIZE, this.SQUARE_SIZE).bcol("#f77").zIndexNumber(200).ta("center").
                        addEventListener("mousedown", this.cancelDivClicked.bind(this)).a([
                        new Div().mt(this.SQUARE_SIZE / 3).h("Cancel").cp()
                    ]);
                    this.boardPieceDiv.a([cancelDiv]);
                }
            }
        }
        this.a([
            this.boardSquareDiv,
            this.boardArrowDiv,
            this.boardPieceDiv
        ]);
        if (this.b.changeLog.kind == "ratingscalculated") {
            let gst = this.b.gameStatus;
            this.boardResultDiv.h(`
<br><br>
Game ended<br><br>
Result: ${gst.score}<br><br>
${gst.scoreReason}<br><br><br>
${gst.ratingCalcWhite.username} rating ${gst.ratingCalcWhite.newRatingF()} ( ${gst.ratingCalcWhite.ratingDifferenceF()} )<br><br>
${gst.ratingCalcBlack.username} rating ${gst.ratingCalcBlack.newRatingF()} ( ${gst.ratingCalcBlack.ratingDifferenceF()} )
`);
            this.a([this.boardResultDiv]);
        }
        this.boardPieceDiv.addEventListener("mousemove", this.boardmousemove.bind(this));
        this.boardPieceDiv.addEventListener("mouseup", this.boardmouseup.bind(this));
        let genAlgeb = this.b.genAlgeb;
        let genMove = this.b.moveFromAlgeb(genAlgeb);
        if (!genMove.invalid()) {
            this.drawBoardArrow(genAlgeb);
        }
        return this;
    }
    resetPromMode() {
        this.promMode = false;
        this.proms = [];
        delete this.promMove;
        delete this.promOrig;
        delete this.promCr;
    }
    cancelDivClicked() {
        this.resetPromMode();
        this.build();
    }
    promDivClicked(kind, e) {
        let m = this.promMove;
        if (kind != this.promOrig)
            m.promPiece = new Piece(kind);
        this.resetPromMode();
        if (this.dragMoveCallback == undefined) {
            this.b.makeMove(m);
        }
        else {
            this.dragMoveCallback(this.b.moveToAlgeb(m));
        }
    }
    piecedragstart(sq, pDiv, e) {
        let me = e;
        me.preventDefault();
        this.draggedSq = sq;
        this.dragstart = new Vect(me.clientX, me.clientY);
        this.draggedPDiv = pDiv;
        this.dragstartst = new Vect(pDiv.getLeftPx(), pDiv.getTopPx());
        this.dragunderway = true;
        for (let pd of this.pDivs) {
            pd.zIndexNumber(0);
        }
        pDiv.zIndexNumber(100);
    }
    boardmousemove(e) {
        let me = e;
        if (this.dragunderway) {
            let client = new Vect(me.clientX, me.clientY);
            this.dragd = client.m(this.dragstart);
            let nsv = this.dragstartst.p(this.dragd);
            this.draggedPDiv.
                leftPx(nsv.x).
                topPx(nsv.y);
        }
    }
    HALF_SQUARE_SIZE_VECT() {
        return new Vect(this.SQUARE_SIZE / 2, this.SQUARE_SIZE / 2);
    }
    SQUARE_SIZE_PX() {
        return this.SQUARE_SIZE / SCALE_FACTOR();
    }
    screenvectortosquare(sv) {
        let f = Math.floor(sv.x / this.SQUARE_SIZE_PX());
        let r = Math.floor(sv.y / this.SQUARE_SIZE_PX());
        return new Square(f, r);
    }
    squaretoscreenvector(sq) {
        let x = sq.f * this.SQUARE_SIZE_PX();
        let y = sq.r * this.SQUARE_SIZE_PX();
        return new Vect(x, y);
    }
    rotateSquare(sq, flip) {
        if (flip == 0)
            return new Square(sq.f, sq.r);
        return new Square(this.b.BOARD_WIDTH - 1 - sq.f, this.b.BOARD_HEIGHT - 1 - sq.r);
    }
    doFlip() {
        this.setFlip(1 - this.flip);
        this.build();
    }
    boardmouseup(e) {
        let me = e;
        if (this.dragunderway) {
            this.dragunderway = false;
            let dragdcorr = this.dragd.p(this.HALF_SQUARE_SIZE_VECT());
            let dragdnom = dragdcorr;
            let dsq = this.screenvectortosquare(dragdnom);
            let dsv = this.squaretoscreenvector(dsq);
            let nsv = this.dragstartst.p(dsv);
            this.draggedPDiv.
                leftPx(nsv.x).
                topPx(nsv.y);
            let fromsqorig = this.rotateSquare(this.draggedSq, this.flip);
            let tosq = this.rotateSquare(fromsqorig.p(dsq), -this.flip);
            let m = new Move(this.draggedSq, tosq);
            let algeb = this.b.moveToAlgeb(m);
            if (this.dragMoveCallback != undefined) {
                let cr = this.b.getCastlingRight(m);
                if (this.b.isMoveCapture(m)) {
                    this.dragMoveCallback(algeb);
                }
                else if (cr != undefined) {
                    this.promCr = cr;
                    this.promMode = true;
                    this.proms = ["n", "r", "q"];
                    this.promOrig = "r";
                    this.promMove = m;
                    this.build();
                }
                else {
                    let legalAlgebs = this.b.legalAlgebMoves().filter(talgeb => talgeb.substring(0, 4) == algeb);
                    let p = this.b.getSq(this.draggedSq);
                    this.proms = legalAlgebs.map(lalgeb => (lalgeb + p.kind).substring(4, 5));
                    if (this.proms.length > 1) {
                        this.promMode = true;
                        this.promOrig = p.kind;
                        this.promMove = m;
                        this.build();
                    }
                    else {
                        this.dragMoveCallback(algeb);
                    }
                }
            }
            else {
                this.b.makeAlgebMove(algeb);
            }
        }
    }
    setDragMoveCallback(dragMoveCallback) { this.dragMoveCallback = dragMoveCallback; return this; }
    setFlipCallback(flipCallback) { this.flipCallback = flipCallback; return this; }
    setFlip(flip) {
        this.flip = flip;
        if (this.flipCallback != undefined)
            this.flipCallback();
        return this;
    }
}
const INTRO_HTML = `
<h1>Chess playing interface of ACT Discord Server</h1>

<p>
Provides an opportunity to play variant Promotion Atomic online.
</p>

<br>

<p>
The site is under construction.
</p>
`;
const PROMOTION_ATOMIC_RULES_HTML = `
<h1>Rules of variant Promotion Atomic</h1>

<p>
The rules are the same as of variant Atomic, except that on every non pawn move you can
</p>

<ul>
    <li>leave the piece unchanged</li>
    or
    <li>promote the piece incrementally B -&gt; N -&gt; R -&gt; Q</li>
    or
    <li>underpromote the piece decrementally Q -&gt; R -&gt; N -&gt; B</li>
</ul>

<p>
On castling you can promote the rook.
</p>

<p>
Promotion to king is not possible.
</p>
`;
DEBUG = false;
let PING_INTERVAL = 5000;
let SOCKET_TIMEOUT = 30000;
let USER_COOKIE_EXPIRY = 365;
let CHATDIV_HEIGHT = 225;
let CHATDIV_WIDTH = 375;
let WS_URL = `ws://${document.location.host}/ws`;
let SU = new SystemUser();
//localStorage.clear()
function newSocket() {
    return new WebSocket(`${WS_URL}/?sri=${uniqueId()}`);
}
let ws;
function emit(json) {
    try {
        let jsontext = JSON.stringify(json);
        if (ws.OPEN) {
            //console.log("sending",jsontext)
            ws.send(jsontext);
        }
    }
    catch (err) {
        console.log(err);
    }
}
let lastPong = 0;
function ping() {
    let now = performance.now();
    let timeout = now - lastPong;
    if (timeout > SOCKET_TIMEOUT) {
        //console.log("socket timed out")
        strongSocket();
    }
    else {
        //console.log("timeout",timeout)
        timeoutDiv.h(`${Math.floor(timeout / 1000)} / ${SOCKET_TIMEOUT / 1000}`);
        emit({ t: "ping", time: performance.now() });
        setTimeout(ping, PING_INTERVAL);
    }
}
let chat = new Chat();
function showChat() {
    chatDiv.x.h(chat.asHtml());
}
function strongSocket() {
    ws = newSocket();
    ws.onopen = function () {
        //console.log("socket connected")        
        lastPong = performance.now();
        ping();
    };
    ws.onmessage = (e) => {
        let content = e.data;
        //console.log("received",content)
        try {
            let json = JSON.parse(content);
            let t = json.t;
            //console.log("action",t)
            if (t == "pong") {
                let now = performance.now();
                lastPong = now;
                let time = json.time;
                let lag = now - time;
                //console.log("lag",lag)
                lagDiv.h(`${lag.toLocaleString()}`);
            }
            else if (t == "lichesscode") {
                let code = json.code;
                let username = json.username;
                //console.log(`lichess code received ${username} ${code}`)
                showLichessCode(username, code);
            }
            else if (t == "userregistered") {
                let username = json.username;
                let cookie = json.cookie;
                //console.log(`${username} registered , cookie : ${cookie}`)
                setCookie("user", cookie, USER_COOKIE_EXPIRY);
                emit({
                    t: "userloggedin",
                    username: username,
                    cookie: cookie
                });
            }
            else if (t == "usercheckfailed") {
                let username = json.username;
                //console.log(`check for ${username} failed`)
            }
            else if (t == "setuser") {
                loggedUser = createUserFromJson(json.u);
                //console.log(`set user ${loggedUser}`)
                setCookie("user", loggedUser.cookie, USER_COOKIE_EXPIRY);
                setLoggedUser();
            }
            else if (t == "userlist") {
                userlist = new UserList().fromJson(json.userlist);
                //console.log(`set userlist`,userlist)
                setUserList();
            }
            else if (t == "setboard") {
                let boardJson = json.boardJson;
                //console.log("setboard",boardJson)
                let gn = new GameNode().fromJson(boardJson);
                gboard.b.fromGameNode(gn, true);
                let cl = new ChangeLog().fromJson(json.changeLog);
                gboard.b.changeLog = cl;
                handleChangeLog(cl);
            }
            else if (t == "setchat") {
                chat = new Chat().fromJson(json.chat);
                showChat();
            }
            else if (t == "reset") {
                gboard.b.newGame();
            }
        }
        catch (err) {
            console.log(err);
        }
    };
}
strongSocket();
function resetApp() {
    localStorage.clear();
    buildApp();
}
function clog(json) {
    conslog(JSON.stringify(json, null, 2));
}
///////////////////////////////////////////////////////////
function playClicked(pi) {
    if (loggedUser.empty()) {
        new AckInfoWindow("You have to be logged in to play!").build();
    }
    else {
        emit({
            t: "sitplayer",
            color: pi.color,
            u: loggedUser
        });
    }
}
function playBotClicked(pi) {
    emit({
        t: "sitplayer",
        color: pi.color,
        u: new BotUser()
    });
}
function offerDrawClicked(pi) {
    emit({
        t: "offerdraw",
        color: pi.color
    });
}
function acceptDrawClicked(pi) {
    emit({
        t: "acceptdraw"
    });
}
function standClicked(pi) {
    emit({
        t: "standplayer",
        color: pi.color
    });
}
function resignClicked(pi) {
    emit({
        t: "resign",
        color: pi.color
    });
}
function createGuiPlayerInfo(color) {
    let gpi = new GuiPlayerInfo().
        setPlayColor(color).
        setPlayCallback(playClicked).
        setPlayBotCallback(playBotClicked).
        setAcceptDrawCallback(acceptDrawClicked).
        setOfferDrawCallback(offerDrawClicked).
        setStandCallback(standClicked).
        setResignCallback(resignClicked);
    return gpi;
}
let intro;
let rules;
let playtable;
let play;
let legalmoves;
let gboard;
let boardInfoDiv;
let flipButtonSpan;
let modposButtonSpan;
let gameStatusDiv;
let moveInput;
let chatDiv;
let playerDiv;
let guiPlayerInfos = [
    createGuiPlayerInfo(BLACK),
    createGuiPlayerInfo(WHITE)
];
let chatInput;
let users;
let profile;
let tabpane;
let profileTable;
let lagDiv;
let lichessUsernameDiv;
let lichessRatingDiv;
let timeoutDiv;
let usernameInputWindow;
let lichessCodeShowWindow;
let usernameDiv;
let usernameButtonDiv;
let userlist;
function setLoggedUser() {
    usernameButtonDiv.x.a([
        loggedUser.empty() ?
            new Button("Login").onClick(lichessLogin) :
            new Button("Logout").onClick(lichessLogout)
    ]);
    lichessUsernameDiv.h(loggedUser.empty() ? "?" : loggedUser.username);
    lichessRatingDiv.h(loggedUser.empty() ? "?" : `${loggedUser.glicko.ratingF()} ( rd : ${loggedUser.glicko.rdF()} )`);
    tabpane.setCaptionByKey("profile", loggedUser.empty() ? "Profile" : loggedUser.username);
    tabpane.selectTab(loggedUser.empty() ? "play" : "play");
}
function setUserList() {
    users.x;
    userlist.iterate((u) => {
        users.a([
            new Div().ac("user").h(`${u.username} ( ${u.glicko.ratingF()} ) <div class="userdata">member since: ${new Date(u.registeredAt).toLocaleDateString()} , rd: ${u.glicko.rdF()}</div>`)
        ]);
        if (u.e(loggedUser)) {
            let cookie = loggedUser.cookie;
            loggedUser = u;
            //loggedUser.cookie=cookie
            setLoggedUser();
        }
    });
}
function showLichessCode(username, code) {
    lichessCodeShowWindow = new TextInputWindow("showlichesscode");
    lichessCodeShowWindow.setTitle(`Lichess verification code`).
        setInfo(`${username} ! Insert this code into your lichess profile, then press Ok.`).
        setOkCallback(function () {
        //console.log("checking lichess code")
        emit({
            t: "checklichesscode",
            username: username,
            code: code
        });
    }).
        build();
    lichessCodeShowWindow.textinput.setText(code);
}
function lichessLogin() {
    usernameInputWindow = new TextInputWindow("lichessusername");
    usernameInputWindow.setOkCallback(function () {
        let username = usernameInputWindow.textinput.getText();
        emit({
            t: "lichesslogin",
            username: username
        });
    }).setInfo(`Enter your lichess username:`).
        setTitle(`Lichess username`).build();
}
function lichessLogout() {
    setCookie("user", "", USER_COOKIE_EXPIRY);
    loggedUser = new User();
    setLoggedUser();
}
function moveInputEntered() {
    let algeb = moveInput.getText();
    moveInput.clear();
    if (algeb == "reset") {
        emit({
            t: "reset"
        });
    }
    else if (algeb == "del") {
        emit({
            t: "delmove"
        });
    }
    else {
        emit({
            t: "makemove",
            algeb: algeb
        });
    }
}
function moveClicked(algeb, e) {
    //console.log(algeb)
    emit({
        t: "makemove",
        algeb: algeb
    });
}
function boardPosChanged() {
    let lalgebs = gboard.b.legalAlgebMoves().sort();
    legalmoves.x.a(lalgebs.map(algeb => new Div().h(algeb).cp().setColor("#00f").ul().
        addEventListener("mousedown", moveClicked.bind(null, algeb))));
    boardInfoDiv.x.a([
        new TextInput("boardinfo").setText(gboard.b.reportFen()).
            w(gboard.totalBoardWidth() + 60).fs(10)
    ]);
    //gameStatusDiv.h(gboard.b.gameStatus.score+" "+gboard.b.gameStatus.scoreReason)
    for (let i = 0; i < guiPlayerInfos.length; i++) {
        guiPlayerInfos[i].setPlayerInfo(gboard.b.gameStatus.playersinfo.playersinfo[i]);
    }
    buildFlipButtonSpan();
    buildModposButtonSpan();
    buildPlayerDiv();
}
function dragMoveCallback(algeb) {
    //console.log("drag move",algeb)
    emit({
        t: "makemove",
        algeb: algeb
    });
}
function chatInputCallback() {
    let text = chatInput.getTextAndClear();
    emit({
        t: "chat",
        chatitem: new ChatItem(loggedUser, text).toJson()
    });
}
function chatButtonClicked() {
    chatInputCallback();
}
function handleChangeLog(cl) {
    //console.log("handle change log",cl)        
    let colorName = cl.pi.colorName();
    if (cl.kind == "sitplayer") {
        chat.add(new ChatItem(SU, `${cl.pi.u.smartNameHtml()} has been seated as ${colorName}`));
        showChat();
        playSound("newchallengesound");
    }
    else if (cl.kind == "standplayer") {
        chat.add(new ChatItem(SU, `${cl.u.smartNameHtml()} has been unseated as ${colorName} ${cl.reason}`));
        showChat();
        playSound("defeatsound");
    }
    else if (cl.kind == "movemade") {
        playSound("movesound");
    }
    else if (cl.kind == "boardreset") {
        playSound("newpmsound");
    }
    else if (cl.kind == "ratingscalculated") {
        emit({
            t: "chat",
            chatitem: new ChatItem(loggedUser, `${gboard.b.gameStatus.ratingCalcBlack.username} - ${gboard.b.gameStatus.ratingCalcWhite.username} game ended ${gboard.b.gameStatus.score} ${gboard.b.gameStatus.scoreReason}`).toJson()
        });
        playSound("newchallengesound");
    }
    gboard.build();
}
function buildPlayerDiv() {
    playerDiv.x.a([
        new Table().bs().a([
            new Tr().a([
                guiPlayerInfos[gboard.flip == 0 ? 0 : 1].build()
            ]),
            new Tr().a([
                chatDiv
            ]),
            new Tr().a([
                guiPlayerInfos[gboard.flip == 0 ? 1 : 0].build()
            ])
        ])
    ]);
}
function buildApp() {
    intro = new Div().ac("contentdiv").h(INTRO_HTML);
    rules = new Div().ac("contentdiv").h(PROMOTION_ATOMIC_RULES_HTML);
    users = new Div();
    gboard = new GuiBoard().setPosChangedCallback(boardPosChanged);
    play = new Div().a([
        gboard.build()
    ]);
    chatDiv = new Div().z(CHATDIV_WIDTH, CHATDIV_HEIGHT).
        bcol("#eef").setOverflow("scroll");
    chatInput = new TextInput("chatinput").setEnterCallback(chatInputCallback);
    chatInput.w(gboard.totalBoardWidth() - 70);
    let playtable = new Table().bs().a([
        new Tr().a([
            new Td().a([
                play
            ]),
            new Td().a([
                legalmoves = new Div()
            ]).setVerticalAlign("top"),
            new Td().pr().a([
                new Div().pa().o(3, 3).a([
                    playerDiv = new Div()
                ])
            ])
        ]),
        new Tr().a([
            new Td().cs(2).a([
                moveInput = new TextInput("moveinput").setEnterCallback(moveInputEntered),
                flipButtonSpan = new Span(),
                modposButtonSpan = new Span(),
                gameStatusDiv = new Div().ib().ml(5),
                boardInfoDiv = new Div().mt(3)
            ]),
            new Td().a([
                chatInput.mt(3),
                new Button("Chat").onClick(chatButtonClicked).mt(3)
            ])
        ])
    ]);
    buildPlayerDiv();
    buildFlipButtonSpan();
    buildModposButtonSpan();
    profileTable = new Table().bs();
    profileTable.a([
        new Tr().a([
            new Td().a([
                new Div().setWidthRem(200).h(`Lichess username`)
            ]),
            new Td().a([
                lichessUsernameDiv = new Div().setWidthRem(400)
            ]),
            new Td().a([
                usernameButtonDiv = new Div()
            ])
        ]),
        new Tr().a([
            new Td().a([
                new Div().h(`Lag`)
            ]),
            new Td().a([
                lagDiv = new Div()
            ])
        ]),
        new Tr().a([
            new Td().a([
                new Div().h(`Rating`)
            ]),
            new Td().a([
                lichessRatingDiv = new Div()
            ])
        ]),
        new Tr().a([
            new Td().a([
                new Div().h(`Timeout`)
            ]),
            new Td().a([
                timeoutDiv = new Div()
            ])
        ])
    ]);
    profile = new Div().a([
        profileTable
    ]);
    let log = new Logpane();
    tabpane = new Tabpane("maintabpane").
        setTabs([
        new Tab("intro", "Intro", intro),
        new Tab("rules", "Rules", rules),
        new Tab("users", "Users", users),
        new Tab("play", "Play", playtable),
        new Tab("profile", "Profile", profile),
    ]).
        snapToWindow().
        build();
    log.log(new Logitem("application started", "info"));
    conslog = log.logText.bind(log);
    Layers.init();
    Layers.root.a([tabpane]);
    setLoggedUser();
    legalmoves.setHeightRem(gboard.totalBoardHeight()).setOverflow("scroll");
    gboard.b.posChanged();
    gboard.setDragMoveCallback(dragMoveCallback);
    gboard.setFlipCallback(boardPosChanged);
}
function buildFlipButtonSpan() {
    let lseated = false;
    gboard.b.gameStatus.playersinfo.iterate((pi) => {
        if (pi.u.e(loggedUser)) {
            gboard.flip = pi.color == WHITE ? 0 : 1;
            lseated = true;
            gboard.build();
        }
    });
    flipButtonSpan.x.a([
        lseated ? new Span() :
            new Button("Flip").onClick((e) => gboard.doFlip())
    ]);
}
function buildModposButtonSpan() {
    modposButtonSpan.x;
    if (!gboard.b.allSeated())
        modposButtonSpan.a([
            new Button("Del").onClick((e) => emit({ t: "delmove" })),
            new Button("Reset").onClick((e) => emit({ t: "reset" }))
        ]);
}
function playSound(id) {
    let e = document.getElementById(id);
    if (e != null) {
        e.play();
    }
}
setInterval(decClock, 1000);
function decClock() {
    if (gboard.b.gameStatus.started) {
        for (let gpi of guiPlayerInfos) {
            if (gpi.pi.color == gboard.b.turn) {
                gpi.pi.showTime -= 1000;
                gpi.build("gameclockactive");
            }
            else {
                gpi.build("gameclockpassive");
            }
        }
    }
}
buildApp();
DEBUG = true;
