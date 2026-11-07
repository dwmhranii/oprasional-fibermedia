import{a as o}from"./vendor-react-CRp4-p1P.js";function c(e,t){const[u,r]=o.useState(e);return o.useEffect(()=>{const n=setTimeout(()=>{r(e)},t);return()=>{clearTimeout(n)}},[e,t]),u}export{c as u};
