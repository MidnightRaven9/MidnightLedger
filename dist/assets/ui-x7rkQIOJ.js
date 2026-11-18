function rt(a,y){for(var f=0;f<y.length;f++){const d=y[f];if(typeof d!="string"&&!Array.isArray(d)){for(const _ in d)if(_!=="default"&&!(_ in a)){const h=Object.getOwnPropertyDescriptor(d,_);h&&Object.defineProperty(a,_,h.get?h:{enumerable:!0,get:()=>d[_]})}}}return Object.freeze(Object.defineProperty(a,Symbol.toStringTag,{value:"Module"}))}function st(a){return a&&a.__esModule&&Object.prototype.hasOwnProperty.call(a,"default")?a.default:a}var H={exports:{}},r={};/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var B;function ct(){if(B)return r;B=1;var a=Symbol.for("react.transitional.element"),y=Symbol.for("react.portal"),f=Symbol.for("react.fragment"),d=Symbol.for("react.strict_mode"),_=Symbol.for("react.profiler"),h=Symbol.for("react.consumer"),w=Symbol.for("react.context"),E=Symbol.for("react.forward_ref"),T=Symbol.for("react.suspense"),N=Symbol.for("react.memo"),g=Symbol.for("react.lazy"),Z=Symbol.for("react.activity"),X=Symbol.for("react.view_transition"),P=Symbol.iterator;function J(t){return t===null||typeof t!="object"?null:(t=P&&t[P]||t["@@iterator"],typeof t=="function"?t:null)}var O={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},b=Object.assign,L={};function m(t,e,n){this.props=t,this.context=e,this.refs=L,this.updater=n||O}m.prototype.isReactComponent={},m.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")},m.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function z(){}z.prototype=m.prototype;function R(t,e,n){this.props=t,this.context=e,this.refs=L,this.updater=n||O}var $=R.prototype=new z;$.constructor=R,b($,m.prototype),$.isPureReactComponent=!0;var q=Array.isArray;function x(){}var i={H:null,A:null,T:null,S:null},I=Object.prototype.hasOwnProperty;function A(t,e,n){var o=n.ref;return{$$typeof:a,type:t,key:e,ref:o!==void 0?o:null,props:n}}function Q(t,e){return A(t.type,e,t.props)}function j(t){return typeof t=="object"&&t!==null&&t.$$typeof===a}function F(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var D=/\/+/g;function S(t,e){return typeof t=="object"&&t!==null&&t.key!=null?F(""+t.key):e.toString(36)}function tt(t){switch(t.status){case"fulfilled":return t.value;case"rejected":throw t.reason;default:switch(typeof t.status=="string"?t.then(x,x):(t.status="pending",t.then(function(e){t.status==="pending"&&(t.status="fulfilled",t.value=e)},function(e){t.status==="pending"&&(t.status="rejected",t.reason=e)})),t.status){case"fulfilled":return t.value;case"rejected":throw t.reason}}throw t}function M(t,e,n,o,c){var u=typeof t;(u==="undefined"||u==="boolean")&&(t=null);var p=!1;if(t===null)p=!0;else switch(u){case"bigint":case"string":case"number":p=!0;break;case"object":switch(t.$$typeof){case a:case y:p=!0;break;case g:return p=t._init,M(p(t._payload),e,n,o,c)}}if(p)return c=c(t),p=o===""?"."+S(t,0):o,q(c)?(n="",p!=null&&(n=p.replace(D,"$&/")+"/"),M(c,e,n,"",function(ot){return ot})):c!=null&&(j(c)&&(c=Q(c,n+(c.key==null||t&&t.key===c.key?"":(""+c.key).replace(D,"$&/")+"/")+p)),e.push(c)),1;p=0;var k=o===""?".":o+":";if(q(t))for(var l=0;l<t.length;l++)o=t[l],u=k+S(o,l),p+=M(o,e,n,u,c);else if(l=J(t),typeof l=="function")for(t=l.call(t),l=0;!(o=t.next()).done;)o=o.value,u=k+S(o,l++),p+=M(o,e,n,u,c);else if(u==="object"){if(typeof t.then=="function")return M(tt(t),e,n,o,c);throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.")}return p}function C(t,e,n){if(t==null)return t;var o=[],c=0;return M(t,o,"","",function(u){return e.call(n,u,c++)}),o}function et(t){if(t._status===-1){var e=t._result,n=e();n.then(function(o){(t._status===0||t._status===-1)&&(t._status=1,t._result=o,n.status===void 0&&(n.status="fulfilled",n.value=o))},function(o){(t._status===0||t._status===-1)&&(t._status=2,t._result=o,n.status===void 0&&(n.status="rejected",n.reason=o))}),t._status===-1&&(t._status=0,t._result=n)}if(t._status===1)return t._result.default;throw t._result}var U=typeof reportError=="function"?reportError:function(t){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var e=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof t=="object"&&t!==null&&typeof t.message=="string"?String(t.message):String(t),error:t});if(!window.dispatchEvent(e))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",t);return}console.error(t)};function Y(t){var e=i.T,n={};n.types=e!==null?e.types:null,i.T=n;try{var o=t(),c=i.S;c!==null&&c(n,o),typeof o=="object"&&o!==null&&typeof o.then=="function"&&o.then(x,U)}catch(u){U(u)}finally{e!==null&&n.types!==null&&(e.types=n.types),i.T=e}}function V(t){var e=i.T;if(e!==null){var n=e.types;n===null?e.types=[t]:n.indexOf(t)===-1&&n.push(t)}else Y(V.bind(null,t))}var nt={map:C,forEach:function(t,e,n){C(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return C(t,function(){e++}),e},toArray:function(t){return C(t,function(e){return e})||[]},only:function(t){if(!j(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};return r.Activity=Z,r.Children=nt,r.Component=m,r.Fragment=f,r.Profiler=_,r.PureComponent=R,r.StrictMode=d,r.Suspense=T,r.ViewTransition=X,r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=i,r.__COMPILER_RUNTIME={__proto__:null,c:function(t){return i.H.useMemoCache(t)}},r.addTransitionType=V,r.cache=function(t){return function(){return t.apply(null,arguments)}},r.cacheSignal=function(){return null},r.cloneElement=function(t,e,n){if(t==null)throw Error("The argument must be a React element, but you passed "+t+".");var o=b({},t.props),c=t.key;if(e!=null)for(u in e.key!==void 0&&(c=""+e.key),e)!I.call(e,u)||u==="key"||u==="__self"||u==="__source"||u==="ref"&&e.ref===void 0||(o[u]=e[u]);var u=arguments.length-2;if(u===1)o.children=n;else if(1<u){for(var p=Array(u),k=0;k<u;k++)p[k]=arguments[k+2];o.children=p}return A(t.type,c,o)},r.createContext=function(t){return t={$$typeof:w,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null},t.Provider=t,t.Consumer={$$typeof:h,_context:t},t},r.createElement=function(t,e,n){var o,c={},u=null;if(e!=null)for(o in e.key!==void 0&&(u=""+e.key),e)I.call(e,o)&&o!=="key"&&o!=="__self"&&o!=="__source"&&(c[o]=e[o]);var p=arguments.length-2;if(p===1)c.children=n;else if(1<p){for(var k=Array(p),l=0;l<p;l++)k[l]=arguments[l+2];c.children=k}if(t&&t.defaultProps)for(o in p=t.defaultProps,p)c[o]===void 0&&(c[o]=p[o]);return A(t,u,c)},r.createRef=function(){return{current:null}},r.forwardRef=function(t){return{$$typeof:E,render:t}},r.isValidElement=j,r.lazy=function(t){return{$$typeof:g,_payload:{_status:-1,_result:t},_init:et}},r.memo=function(t,e){return{$$typeof:N,type:t,compare:e===void 0?null:e}},r.startTransition=Y,r.unstable_useCacheRefresh=function(){return i.H.useCacheRefresh()},r.use=function(t){return i.H.use(t)},r.useActionState=function(t,e,n){return i.H.useActionState(t,e,n)},r.useCallback=function(t,e){return i.H.useCallback(t,e)},r.useContext=function(t){return i.H.useContext(t)},r.useDebugValue=function(){},r.useDeferredValue=function(t,e){return i.H.useDeferredValue(t,e)},r.useEffect=function(t,e){return i.H.useEffect(t,e)},r.useEffectEvent=function(t){return i.H.useEffectEvent(t)},r.useId=function(){return i.H.useId()},r.useImperativeHandle=function(t,e,n){return i.H.useImperativeHandle(t,e,n)},r.useInsertionEffect=function(t,e){return i.H.useInsertionEffect(t,e)},r.useLayoutEffect=function(t,e){return i.H.useLayoutEffect(t,e)},r.useMemo=function(t,e){return i.H.useMemo(t,e)},r.useOptimistic=function(t,e){return i.H.useOptimistic(t,e)},r.useReducer=function(t,e,n){return i.H.useReducer(t,e,n)},r.useRef=function(t){return i.H.useRef(t)},r.useState=function(t){return i.H.useState(t)},r.useSyncExternalStore=function(t,e,n){return i.H.useSyncExternalStore(t,e,n)},r.useTransition=function(){return i.H.useTransition()},r.version="19.3.1",r}var K;function at(){return K||(K=1,H.exports=ct()),H.exports}var v=at();const ut=st(v),ne=rt({__proto__:null,default:ut},[v]);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const it=a=>a.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),pt=a=>a.replace(/^([A-Z])|[\s-_]+(\w)/g,(y,f,d)=>d?d.toUpperCase():f.toLowerCase()),W=a=>{const y=pt(a);return y.charAt(0).toUpperCase()+y.slice(1)},G=(...a)=>a.filter((y,f,d)=>!!y&&y.trim()!==""&&d.indexOf(y)===f).join(" ").trim(),yt=a=>{for(const y in a)if(y.startsWith("aria-")||y==="role"||y==="title")return!0};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var dt={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ft=v.forwardRef(({color:a="currentColor",size:y=24,strokeWidth:f=2,absoluteStrokeWidth:d,className:_="",children:h,iconNode:w,...E},T)=>v.createElement("svg",{ref:T,...dt,width:y,height:y,stroke:a,strokeWidth:d?Number(f)*24/Number(y):f,className:G("lucide",_),...!h&&!yt(E)&&{"aria-hidden":"true"},...E},[...w.map(([N,g])=>v.createElement(N,g)),...Array.isArray(h)?h:[h]]));/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=(a,y)=>{const f=v.forwardRef(({className:d,..._},h)=>v.createElement(ft,{ref:h,iconNode:y,className:G(`lucide-${it(W(a))}`,`lucide-${a}`,d),..._}));return f.displayName=W(a),f};/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lt=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],oe=s("activity",lt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ht=[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]],re=s("award",ht);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _t=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]],se=s("calendar-days",_t);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kt=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m14 14-4 4",key:"rymu2i"}],["path",{d:"m10 14 4 4",key:"3sz06r"}]],ce=s("calendar-x",kt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vt=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],ae=s("calendar",vt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mt=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],ue=s("chart-column",mt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mt=[["path",{d:"M5 21v-6",key:"1hz6c0"}],["path",{d:"M12 21V3",key:"1lcnhd"}],["path",{d:"M19 21V9",key:"unv183"}]],ie=s("chart-no-axes-column",Mt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Et=[["path",{d:"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",key:"pzmjnu"}],["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83",key:"k2fpak"}]],pe=s("chart-pie",Et);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],ye=s("check",gt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],de=s("chevron-down",Ct);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wt=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],fe=s("chevron-up",wt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],le=s("circle-alert",Tt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],he=s("circle-check",Nt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]],_e=s("circle-plus",Rt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $t=[["path",{d:"M12 6v6l4 2",key:"mmk7yg"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],ke=s("clock",$t);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xt=[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]],ve=s("coins",xt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]],me=s("credit-card",At);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jt=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],Me=s("dollar-sign",jt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],Ee=s("download",St);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ht=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],ge=s("eye-off",Ht);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],Ce=s("funnel",Pt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]],we=s("history",Ot);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bt=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],Te=s("layout-dashboard",bt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lt=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],Ne=s("moon",Lt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=[["path",{d:"M13 21h8",key:"1jsn5i"}],["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],Re=s("pen-line",zt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],$e=s("pen",qt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const It=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],xe=s("plus",It);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]],Ae=s("receipt",Dt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]],je=s("rotate-ccw",Ut);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],Se=s("save",Yt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vt=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],He=s("search",Vt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Pe=s("settings",Bt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=[["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}],["path",{d:"M3.103 6.034h17.794",key:"awc11p"}],["path",{d:"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z",key:"o988cm"}]],Oe=s("shopping-bag",Kt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],be=s("sparkles",Wt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gt=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],Le=s("tag",Gt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],ze=s("trash-2",Zt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xt=[["path",{d:"M16 17h6v-6",key:"t6n2it"}],["path",{d:"m22 17-8.5-8.5-5 5L2 7",key:"x473p"}]],qe=s("trending-down",Xt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],Ie=s("trending-up",Jt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],De=s("triangle-alert",Qt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ft=[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]],Ue=s("upload",Ft);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],Ye=s("users",te);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],Ve=s("x",ee);export{re as A,ye as B,se as C,Ee as D,ge as E,Ce as F,Ye as G,we as H,me as I,Se as J,ve as K,Te as L,Ne as M,Le as N,be as O,$e as P,ne as R,Oe as S,De as T,Ue as U,Ve as X,v as a,ze as b,Ae as c,ue as d,je as e,ut as f,st as g,ae as h,ke as i,de as j,he as k,ce as l,xe as m,pe as n,He as o,Pe as p,Re as q,at as r,_e as s,qe as t,Me as u,ie as v,Ie as w,le as x,fe as y,oe as z};
