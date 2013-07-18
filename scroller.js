(function(win, doc) {

    var hasTouch = 'ontouchstart' in win,
        slice = Array.prototype.slice,
        Mth = win.Math,
        dummyStyle = doc.createElement('div').style,
        vendor = (function () {
            var vendors = 't,webkitT,MozT,msT,OT'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for ( ; i < l; i++ ) {
                t = vendors[i] + 'ransform';
                if ( t in dummyStyle ) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),
        START_EV = hasTouch ? 'touchstart' : 'mousedown',
        MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
        END_EV = hasTouch ? 'touchend' : 'mouseup',
        CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
        RESIZE_EV = 'onorientationchange' in win ? 'orientationchange' : 'resize',
        nextFrame = (function() {
            return win.requestAnimationFrame ||
                win.webkitRequestAnimationFrame ||
                win.mozRequestAnimationFrame ||
                win.oRequestAnimationFrame ||
                win.msRequestAnimationFrame ||
                function(callback) { return setTimeout(callback, 1); };
        })(),
        cancelFrame = (function () {
            return win.cancelRequestAnimationFrame ||
                win.webkitCancelAnimationFrame ||
                win.webkitCancelRequestAnimationFrame ||
                win.mozCancelRequestAnimationFrame ||
                win.oCancelRequestAnimationFrame ||
                win.msCancelRequestAnimationFrame ||
                clearTimeout;
        })(),
        has3d = prefixStyle('perspective') in dummyStyle,
        translateZ = has3d ? ' translateZ(0)' : '';
    function prefixStyle(style) {
        if (vendor === '') return style;
        style = style.charAt(0).toUpperCase() + style.substr(1);
        return vendor + style;
    }
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(func, context) {
            context || (context = win);
            for (var i = 0, len = this.length; i < len; i++) {
                func.call(context, this[i], i, this);
            }
        };
    }

    function merge(obj) {
        var args = slice.call(arguments, 1);
        args.forEach(function(o) {
            if (Object(obj) === obj) {
                for (var key in o) {
                    if (o.hasOwnProperty(key)) {
                        obj[key] = o[key];
                    }
                }
            }
        });
        return obj;
    }

    Scroller.easing = {

        linear : function(t){
            return t;
        },

        easeIn : function(t){
            return t * t;
        },

        easeOut : function(t){
            return ( 2 - t) * t;
        },

        swing : function( t ) {
            return 0.5 - Mth.cos(t * Mth.PI) / 2;
        }

    };
    
    function Scroller(ele, options) {
        this.ele = typeof ele === 'string' ? doc.querySelector(ele) :
                   ele.nodeType === 1      ? ele :
                   null;
        if (!this.ele) throw 'ele must be an element';
        this.ele.style.overflow = 'hidden';
        this.scroller = this.ele.children[0];
        this.opts = {
            h: true,
            v: true,
            x: 0,
            y: 0,
            easing: 'easeOut',
            onBeforeScrollStart: function(e) { e.preventDefault(); },
            onScrollStart: null,
            onBeforeScrollMove: null,
            onScrollMove: null,
            onBeforeScrollEnd: null,
            onScrollEnd: null,
            onTouchEnd: null,
            onDestroy: null
        };
        options && merge(this.opts, options || {});
        if (!this.opts.h && !this.opts.v) return;
        this.x = this.opts.x;
        this.y = this.opts.y;
        this.posX = 0;
        this.posY = 0;
        this.steps = [];
        this.touched = false;
        this.easing = Scroller.easing[this.opts.easing];
        if (!hasTouch) {
            this._bind('mouseout', this.ele);
        }
        this.scrollerEle = document.createElement('div');
        this.scollerEleStyle = this.scrollerEle.style;
        this.scollerEleStyle.cssText = 'position:absolute;z-index:1000;top:0;right:1px;width:5px;border-radius:3px;background-color:rgba(0,0,0,.7);' + translateZ;
        this.scollerEleStyle.height = (this.ele.offsetHeight * this.ele.offsetHeight/this.scroller.offsetHeight) + 'px';
        this.ele.appendChild(this.scrollerEle);
        this._bind(RESIZE_EV, win);
        this._bind(START_EV);
        this.refresh();
    }

    Scroller.prototype = {

        constructor: Scroller,

        handleEvent: function(e) {
            switch(e.type) {
                case START_EV:
                    if (!hasTouch && e.button !== 0) return;
                    if (this.opts.onBeforeScrollStart) this.opts.onBeforeScrollStart.call(this, e);
                    this._start(this.getE(e), e);
                    if (this.opts.onScrollStart) this.opts.onScrollStart.call(this, e);
                    break;
                case MOVE_EV:
                    if (this.opts.onBeforeScrollMove) this.opts.onBeforeScrollMove.call(this, e);
                    this._move(this.getE(e), e);
                    if (this.opts.onScrollMove) this.opts.onScrollMove.call(this, e);
                    break;
                case END_EV:
                case CANCEL_EV: 
                    if (this.opts.onBeforeScrollEnd) this.opts.onBeforeScrollEnd.call(this, e);
                    this._end(this.getE(e), e);
                    if (this.opts.onTouchEnd) this.opts.onTouchEnd.call(this, e);
                    break;
                case RESIZE_EV: this._resize(); break;
                case 'mouseout': this._mouseout(e); break;
            }
        },

        getE: function(e) {
            return hasTouch ? (e.touches.length ? e.touches[0] : e) : e;
        },

        getCmpOff: function(offx, tp) {
            return (offx > 0          ? (offx *= 0.5) :
                    offx < this[tp]   ? (this[tp] + (offx - this[tp]) * 0.5) :
                    offx);
        },

        _pos: function(offx, offy) {
            if (this.opts.h) {
                offx = this.getCmpOff(offx, 'minX');
            } else {
                offx = 0;
            }
            if (this.opts.v) {
                offy = this.getCmpOff(offy, 'minY');
                if (offy > 0) {
                    this.scollerEleStyle.top = '0px';
                } else if (offy < this.minY) {
                    this.scollerEleStyle.top = (this.ele.offsetHeight - this.scrollerEle.offsetheight) + 'px';
                } else {
                    this.scollerEleStyle.top = Mth.abs(this.ele.offsetHeight * offy/this.scroller.offsetHeight) + 'px';
                }
            } else {
                offy = 0;
            }

            this.scroller.style[vendor + 'Transform'] = 'translate(' + offx + 'px, ' + offy + 'px)' + ' ' + translateZ;
        },

        _start: function(e, originE) {
            this.speedX = 0;
            this.speedY = 0;
            this.touched = true;
            this.startX = e.pageX;
            this.startY = e.pageY;
            this.posX = this.x;
            this.posY = this.y;
            this._bind(MOVE_EV);
            this._bind(END_EV);
            this._bind(CANCEL_EV);
        },

        _move: function(e, originE) {
            this.moving = true;
            if (this.opts.h) {
                this.posX = this.x + e.pageX - this.startX;
            }
            if (this.opts.v) {
                this.posY = this.y + e.pageY - this.startY;
            }
            this._pos(this.posX, this.posY);
            this.steps.push([(originE.timeStamp || Date.now()), this.posX, this.posY]);
        },

        _cmpSpeed: function(diff, len, step) {
            if (this.opts.h) {
                this.speedX = len > 1 ? 1 * (this.posX - step[1]) / diff : 0;
                this.time = Mth.abs(this.speedX) * 200;
                this.toX = this.posX + this.time * this.speedX;
            }
            if (this.opts.v) {
                this.speedY = len > 1 ? 1 * (this.posY - step[2]) / diff : 0;
                this.time = Mth.abs(this.speedY) * 200;
                this.toY = this.posY + this.time * this.speedY * 2;
            }
        },

        _end: function(e, originE) {
            var steps = this.steps;
            var t = originE.timeStamp || Date.now();
            var len = steps.length;
            while(len > 1){
                if(t - steps[0][0] > 300) {
                    // 时间超过300ms 移除掉
                    steps.shift();
                    len -= 1;
                } else {
                    break;
                }  
            }
            this.time = 200;
            this.toX = this.posX;
            this.toY = this.posY;
            this._cmpSpeed(t - steps[0][0], len, steps[0]);
            this.moving = false;
            this.x = this.posX;
            this.y = this.posY;
            this._frame = nextFrame(this._run.bind(this));
            this.touched = false;
            this._unbind(MOVE_EV);
            this._unbind(END_EV);
            this._unbind(CANCEL_EV);
        },

        _calPos: function(per, dir) {
            var x = dir === 'h' ? 'x' : 'y', X = x.toUpperCase();
            if (this.opts[dir] && Mth.abs(this[x] - this['to' + X]) > 2 && this['speed' + X]) {
                this[x] = this['pos' + X] + (this['to' + X] - this['pos' + X]) * this.easing(per);
            } else {
                this['speed' + X] = 0;
            }
        },

        _calAni: function() {
            var per = (Date.now() - this.steps[this.steps.length - 1][0]) / this.time;
            if (per > 1) per = 1;
            this._calPos(per, 'h');
            this._calPos(per, 'v');
            this._pos(this.x, this.y);
        },

        _cmpOut: function(dir) {
            var x = dir === 'h' ? 'x' : 'y', X = x.toUpperCase();
            if (this.opts[dir]) {
                if (this[x] > 0) {
                    this['speed' + X] = 0;
                    this[x] *= 0.8;
                    if (this[x] < 4)
                        this[x] = 0;
                    else
                        this[x] -= 4;
                } else if (this[x] < this['min' + X]) {
                    this['speed' + X] = 0;
                    this[x] += (this['min' + X] - this[x]) * 0.2;
                    if (this[x] + 4 > this['min' + X])
                        this[x] = this['min' + X];
                    else
                        this[x] += 4;
                }
            }
        },

        _calOut: function() {
            this._cmpOut('h');
            this._cmpOut('v');
            this._pos(this.x, this.y);
        },

        _run: function() {
            if (!this.moving) {
                this._calAni();
                this._calOut();
                this.animating = true;
                if (this.speedX != 0 || this.speedY != 0 || this.x < this.minX || this.x > 0 ||
                    this.y < this.minY || this.y > 0) {
                    this._frame = nextFrame(this._run.bind(this));
                } else {
                    if (this.opts.onScrollEnd) this.opts.onScrollEnd.call(this, e);
                    this.animating = false;
                }
            }
        },

        _resize: function() {
            this.refresh();
        },

        _mouseout: function(e) {
            var t = e.relatedTarget;
            if (!t) {
                this._end(e, e);
                return;
            }
            while (t = t.parentNode) if (t == this.ele) return;
            this._end(e, e);
        },
        
        _bind: function(type, el, bubble) {
            (el || this.scroller).addEventListener(type, this, !!bubble);
        },

        _unbind: function (type, el, bubble) {
            (el || this.scroller).removeEventListener(type, this, !!bubble);
        },

        refresh: function() {
            // 最小的水平方向滚动值
            this.minX = Mth.min(0, this.ele.clientWidth - this.scroller.offsetWidth);
            // 最小的垂直方向滚动值
            this.minY = Mth.min(0, this.ele.clientHeight - this.scroller.offsetHeight)
            this.steps.length = 0;
            this.speedX = 0;
            this.speedY = 0;
            this.touched = false;
            this.animating = false;
            this.moving = false;
        },

        destroy: function() {
            if (this.opts.onDestroy) this.opts.onDestroy.call(this);
            if (!hasTouch) {
                this._unbind('mouseout', this.ele);
            }
            this._unbind(RESIZE_EV, win);
            this._unbind(START_EV);
        }
    };

    win.Scroller = Scroller;

})(window, document);