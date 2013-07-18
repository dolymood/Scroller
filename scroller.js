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
        TRNEND_EV = (function () {
            if ( vendor === false ) return false;

            var transitionEnd = {
                    ''          : 'transitionend',
                    'webkit'    : 'webkitTransitionEnd',
                    'Moz'       : 'transitionend',
                    'O'         : 'oTransitionEnd',
                    'ms'        : 'MSTransitionEnd'
                };

            return transitionEnd[vendor];
        })(),
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
        translateZ = has3d ? ' translateZ(0)' : '',
        _devicePixelRatio = win.devicePixelRatio;
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
    if (!Function.prototype.bind) {
        Function.prototype.bind = function(scope) {
            var that = this;
            scope || (scope = win);
            var args = slice.call(arguments, 1);
            return function() {
                var newArg = args.concat();
                newArg.push.apply(newArg, arguments);
                that.apply(scope, newArg);
            };
        };
    }

    function isObject(obj) {
        return Object(obj) === obj;
    }
    function merge(obj) {
        var args = slice.call(arguments, 1);
        args.forEach(function(o) {
            if (isObject(o)) {
                for (var key in o) {
                    if (o.hasOwnProperty(key)) {
                        obj[key] = o[key];
                    }
                }
            }
        });
        return obj;
    }
    var BACK_CONST = 1.70158;
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

        easeBoth : function(t){
            return (t *= 2) < 1 ?
                .5 * t * t :
                .5 * (1 - (--t) * (t - 2));
        },

        easeInStrong : function(t){
            return t * t * t * t;
        },

        easeOutStrong : function(t){
            return 1 - (--t) * t * t * t;
        },

        easeBothStrong : function(t){
            return (t *= 2) < 1 ?
                .5 * t * t * t * t :
                .5 * (2 - (t -= 2) * t * t * t);
        },
        
        easeOutQuart : function(t){
          return -(Mth.pow((t-1), 4) -1)
        },
        
        easeInOutExpo : function(t){
            if(t===0) return 0;
            if(t===1) return 1;
            if((t/=0.5) < 1) return 0.5 * Mth.pow(2,10 * (t-1));
            return 0.5 * (-Mth.pow(2, -10 * --t) + 2);
        },
        
        easeOutExpo : function(t){
            return (t===1) ? 1 : -Mth.pow(2, -10 * t) + 1;
        },
        
        swing : function( t ) {
            return 0.5 - Mth.cos(t * Mth.PI) / 2;
        },
        
        swingFrom : function(t){
            return t*t*((BACK_CONST+1)*t - BACK_CONST);
        },
        
        swingTo : function(t){
            return (t-=1)*t*((BACK_CONST+1)*t + BACK_CONST) + 1;
        },

        backIn : function(t){
            if (t === 1) t -= .001;
            return t * t * ((BACK_CONST + 1) * t - BACK_CONST);
        },

        backOut : function(t){
            return (t -= 1) * t * ((BACK_CONST + 1) * t + BACK_CONST) + 1;
        },

        bounce : function(t){
            var s = 7.5625, r;

            if (t < (1 / 2.75)) {
                r = s * t * t;
            }
            else if (t < (2 / 2.75)) {
                r = s * (t -= (1.5 / 2.75)) * t + .75;
            }
            else if (t < (2.5 / 2.75)) {
                r = s * (t -= (2.25 / 2.75)) * t + .9375;
            }
            else {
                r = s * (t -= (2.625 / 2.75)) * t + .984375;
            }

            return r;
        },
        
        // windows8开始面板的滑动切换效果
        doubleSqrt : function( t ){
            return Mth.sqrt(Mth.sqrt(t));
        }

    };
    
    function Scroller(ele, options) {
        this.ele = typeof ele === 'string' ? doc.querySelector(ele) :
                   ele.nodeType === 1      ? ele :
                   null;
        if (!this.ele) throw 'ele must be an element';
        this.ele.style.overflow = 'hidden';
        this.scroller = this.ele.children[0];
        this.scollerStyle = this.scroller.style;
        this.opts = {
            h: true,
            v: true,
            x: 0,
            y: 0,
            easing: 'swing',
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

        _pos: function(offx, offy) {
            if (this.opts.h) {
                offx = (offx > 0           ? (offx *= 0.5) :
                        offx < this.minX   ? (this.minX + (offx - this.minX) * 0.5) :
                        offx);
            } else {
                offx = 0;
            }
            if (this.opts.v) {
                offy = (offy > 0           ? (offy *= 0.5) :
                        offy < this.minY   ? (this.minY + (offy - this.minY) * 0.5) :
                        offy);
            } else {
                offy = 0;
            }
            this.scollerStyle[vendor + 'Transform'] = 'translate(' + offx + 'px, ' + offy + 'px)' + ' ' + translateZ;
        },

        _start: function(e, originE) {
            this.speedX = 0;
            this.speedY = 0;
            this.touched = true;
            this.startX = e.pageX;
            this.startY = e.pageY;
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
            var step = steps[0];
            var diff = t - step[0];
            this.time = 200;
            this.toX = this.posX;
            this.toY = this.posY;
            if (this.opts.h) {
                this.speedX = len > 1 ? 1 * (this.posX - step[1]) / diff : 0;
                this.toX = this.posX + this.time * this.speedX;
            }
            if (this.opts.v) {
                this.speedY = len > 1 ? 1 * (this.posY - step[2]) / diff : 0;
                this.time = Mth.abs(this.speedY) * 200;
                this.toY = this.posY + this.time * this.speedY * 2;
            }
            this.moving = false;
            this.x = this.posX;
            this.y = this.posY;
            this._frame = nextFrame(this._run.bind(this));
            this.touched = false;
            this._unbind(MOVE_EV);
            this._unbind(END_EV);
            this._unbind(CANCEL_EV);
        },

        _calSpeed1: function() {
            if (this.opts.h && Mth.abs(this.x - this.posX) > 5 && this.speedX) {
                if (this.speedX > 0.4) {
                    this.speedX -= 0.4;
                    this.x += this.speedX * 0.1 + Mth.min(15, this.speedX);
                } else if (this.speedX < -0.4) {
                    this.speedX += 0.4;
                    this.x += this.speedX * 0.1 + Mth.max(-15, this.speedX);
                } else {
                    this.speedX = 0;
                }
            } else {
                this.speedX = 0;
            }
            if (this.opts.v && Mth.abs(this.y - this.toY) > 5 && this.speedY) {
                // if (this.speedY > 0.4) {
                //     this.speedY -= 0.4;
                //     this.y += this.speedY * 0.1 + Mth.min(15, this.speedY);
                // } else if (this.speedY < -0.4) {
                //     this.speedY += 0.4;
                //     this.y += this.speedY * 0.1 + Mth.max(-15, this.speedY);
                // } else {
                //     this.speedY = 0;
                // }
                var per = (Date.now() - this.steps[this.steps.length - 1][0]) / this.time;
                if (per > 1) per = 1;
                this.y = this.posY + (this.toY - this.posY) * this.easing(per);
            } else {
                this.speedY = 0;
            }
            this._pos(this.x, this.y);
        },

        _calSpeed2: function() {
            if (this.opts.h) {
                if (this.x > 0) {
                    this.speedX = 0;
                    this.x *= 0.8;
                    if (this.x < 4)
                        this.x = 0;
                    else
                        this.x -= 4;
                } else if (this.x < this.minX){
                    this.speedX = 0;
                    this.x += (this.minX - this.x) * 0.2;
                    if (this.x + 4 > this.minX)
                        this.x = this.minX;
                    else
                        this.x += 4;
                }
            }
            if (this.opts.v) {
                if (this.y > 0) {
                    this.speedY = 0;
                    this.y *= 0.8;
                    if (this.y < 4)
                        this.y = 0;
                    else
                        this.y -= 4;
                } else if (this.y < this.minY){
                    this.speedY = 0;
                    this.y += (this.minY - this.y) * 0.2;
                    if (this.y + 4 > this.minY)
                        this.y = this.minY;
                    else
                        this.y += 4;
                }
            }
            this._pos(this.x, this.y);
        },

        _run: function() {
            if (!this.moving) {
                this._calSpeed1();
                this._calSpeed2();
                this.animating = true;
                // 只要还有速度 或者 超出正常范围 就需要继续
                // if (this.speedX != 0 || this.speedY != 0 ||
                //     this.x < this.minX || this.x > 0 ||
                //     this.y < this.minY || this.y > 0) {
                //     this._frame = nextFrame(this._run.bind(this));
                // } else {
                //     if (this.opts.onScrollEnd) this.opts.onScrollEnd.call(this, e);
                //     this.animating = false;
                // }
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
                this._end(e);
                return;
            }
            while (t = t.parentNode) if (t == this.ele) return;
            this._end(e);
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