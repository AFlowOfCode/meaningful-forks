// ==UserScript==
// @name         meaningful-forks
// @homepage     https://github.com/aflowofcode/meaningful-forks
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Sort Github fork lists by the number of stars and commits ahead from the source repo.
// @author       Kevin Li + community
// @match        https://github.com/*/network/members
// @grant        none
// ==/UserScript==
!async function(){let e=new Headers;e.append("Authorization","token <YOUR ACCESS TOKEN>");const t={headers:e},o=document.createElement("span");o.innerText="Sorting 🍴forks...",o.style.position="fixed",o.style.background="#22f922",o.style.padding="10px",o.style.borderRadius="10px",o.style.zIndex="9999",o.style.left="calc(50% - 60px)",o.style.top="calc(50% - 20px)",document.body.appendChild(o);const r=document.querySelector("#network"),n=r.querySelector("span.current-repository").lastElementChild.getAttribute("href").substring(1);console.log("TCL: currentRepoUrl",n);const a=n.substring(0,n.lastIndexOf("/")),s=`https://api.github.com/repos/${n}/forks?sort=stargazers`;console.log("TCL: forkApiUrl",s);let l=await fetch(s,t),i=await l.json(),c={};await Promise.all(i.map(async e=>{if(console.log(e.full_name+", subforks:",e.forks),e.forks>0){let o=await fetch(e.forks_url+"?sort=stargazers",t),r=await o.json();r.forEach(t=>{t.is_subfork=!0,t.forked_from=e.full_name}),c=c.length>0?c.concat(r):r}})),console.log(`Found ${c.length} subforks`);let d=i.concat(c);console.log("TCL: forks.length: "+d.length);const u=[];let h=[];var p,f,g,m;async function b(e,o){let r,n=await fetch(e,t);if(!n.ok)throw new Error("Network response is not OK!");if(r=await n.json(),"string"==typeof o)return a(r,o);if(Array.isArray(o))return o.map(e=>a(r,e));function a(e,t){if(t.indexOf(".")>=0){let o=e;return t.split(".").forEach(e=>{o=o[e]}),o}return e[t]}}async function y(e){return b(`https://api.github.com/repos/${e}`,"default_branch")}function w(e){const t="http://www.w3.org/2000/svg";var o=document.createElementNS(t,"svg");o.setAttribute("height",12),o.setAttribute("width",10.5),o.setAttribute("viewBox","0 0 14 16"),o.style["vertical-align"]="middle",o.style.fill="currentColor",o.style.position="relative",o.style.bottom="1px",o.classList.add("opticon","opticon-"+e);var r=document.createElementNS(t,"title"),n=document.createElementNS(t,"path");switch(e){case"star":r.appendChild(document.createTextNode("Number of real stars (excluding author's star)")),n.setAttribute("d","M14 6l-4.9-0.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14l4.33-2.33 4.33 2.33L10.4 9.26 14 6z"),n.setAttribute("fill","black");break;case"up":r.appendChild(document.createTextNode("Number of commits ahead")),n.setAttribute("d","M5 3L0 9h3v4h4V9h3L5 3z"),n.setAttribute("fill","#84ed47"),o.setAttribute("viewBox","0 0 10 16"),o.setAttribute("height",16);break;case"flame":r.appendChild(document.createTextNode("Fork may be more recent than upstream.")),n.setAttribute("d","M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86 1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02 1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z"),n.setAttribute("fill","#d26911")}return n.appendChild(r),o.appendChild(n),o}function k(e){for(let t=0;t<e.length;t++)console.log("deleting:",d[e[t]]),delete d[e[t]];return d=d.filter(e=>void 0!==e),console.log(`${d.length} remaining forks`),[]}await Promise.all(d.map(async(e,o,r)=>{if(void 0===e.owner)return console.log("marking bad fork for delete",o,e),void h.push(o);const n=e.owner.login;if(console.log("TCL: authorName",n,o),"undefined"===n)return;const a=e.stargazers_url;u.push(await fetch(a,t).then(e=>{if(e.ok)return e.json();throw new Error("Network response is not OK!")}).then(e=>{e.forEach(e=>{e.login===n&&r[o].stargazers_count>0&&(console.log(`TCL: starCount of ${n} before: ${r[o].stargazers_count}`),r[o].stargazers_count--,console.log(`TCL: starCount of ${n} after: ${r[o].stargazers_count}`))})}).catch(function(t){console.log("There has been a problem with your fetch operation: ",t.message,e),h.push(o)}))})),console.log(`found ${h.length} forks with bad data out of ${d.length}`,h),h.length>0&&(h=k(h)),await Promise.all(u),d.sort((p="stargazers_count",f=!0,g=parseInt,m=g?function(e){return g(e[p])}:function(e){return e[p]},f=f?-1:1,function(e,t){return e=m(e),t=m(t),f*((e>t)-(t>e))})),console.log("End of modifying stargazer count!"),await async function(e,t){const o=[];for(let r=0;r<e.length;r++)o.push(t(e[r],r,e));return Promise.all(o)}(d,async(e,t,o)=>{try{const r=e.owner.login,s=e.full_name;let l=await y(n),i=await y(s);const c=`https://api.github.com/repos/${s}/compare/${a}:${l}...${r}:${i}`;let[d,u]=await b(c,["ahead_by","behind_by"]);o[t].ahead_by=d,o[t].behind_by=u}catch(e){console.log(e)}if(e.is_subfork&&0===e.ahead_by)return console.log("marking subfork ahead_by 0 for delete",t,e.full_name),void h.push(t)}),console.log(`found ${h.length} subforks ahead_by 0 out of ${d.length}`,h),h.length>0&&(h=k(h)),d.sort(function(){var e=[].slice.call(arguments),t=e.length;return function(o,r){var n,a,s,l,i,c,d;for(d=0;d<t&&(c=0,s=e[d],l="string"==typeof s?s:s.name,n=o[l],a=r[l],void 0!==s.primer&&(n=s.primer(n),a=s.primer(a)),i=s.highToLow?-1:1,n<a&&(c=-1*i),n>a&&(c=1*i),0===c);d++);return c}}({name:"stargazers_count",primer:parseInt,highToLow:!0},{name:"ahead_by",primer:parseInt,highToLow:!0},{name:"behind_by",primer:parseInt,highToLow:!1})),console.log("Beginning of DOM operations!"),d.reverse().forEach(e=>{console.log("TCL: fork",e);const t=e.full_name,n=e.stargazers_count;console.log(t,n);let a=!1,s=r.querySelectorAll("div.repo");for(let o=0;o<s.length;o++){const r=s[o].lastElementChild.getAttribute("href");if(r){const n=r.substring(1);if(console.log(r,n,t,o),n===t){if(a=!0,e.hasOwnProperty("is_subfork")&&e.is_subfork){console.log("adding dagger to subfork");const e=document.createTextNode("‡");s[o].querySelectorAll('img[src$="l.png"]')[0].replaceWith(e)}l(s[o]);break}}}if(!a){console.log(`${t} repo wasn't showing`);const o=document.createElement("div");o.classList.add("repo");const r=document.createElement("img");r.alt="",r.classList.add("network-tree"),r.src="https://github.githubassets.com/images/modules/network/t.png";const n=e.owner.type.toLowerCase(),a=document.createElement("a");a.setAttribute("data-hovercard-type",n);const s=e.owner.login;if("user"===n){const t=e.owner.id;a.setAttribute("data-hovercard-url",`/hovercards?user_id=${t}`)}else"organization"===n&&(a.setAttribute("data-hovercard-url",`/orgs/${s}/hovercard`),a.setAttribute("href",`/${s}`));a.setAttribute("href",`/${s}`),a.setAttribute("data-octo-click","hovercard-link-click"),a.setAttribute("data-octo-dimensions","link_type:self");const i=a.cloneNode(!0);i.style.paddingLeft="4px",i.style.paddingRight="4px",a.innerText=s,i.classList.add("d-inline-block");const c=document.createElement("img");c.classList.add("gravatar");const d=e.owner.avatar_url;c.src=d,c.width="16",c.height="16",c.alt=`@${s}`,i.appendChild(c);const u=document.createElement("a");u.style.paddingRight="4px",u.setAttribute("href",`/${t}`),u.innerText=e.name,o.appendChild(r),o.appendChild(i),o.appendChild(a),o.appendChild(document.createTextNode(" / ")),o.appendChild(u),l(o)}function l(t){console.log("adding status",t);const o=document.createDocumentFragment();if(o.appendChild(w("star")),o.appendChild(document.createTextNode(n+" ")),e.ahead_by>0){const t=w("up");o.appendChild(t),o.appendChild(document.createTextNode(e.ahead_by+" "))}e.ahead_by-e.behind_by>0&&o.appendChild(w("flame")),e.is_subfork&&o.appendChild(document.createTextNode(` (subfork of ${e.forked_from})`)),t.appendChild(o),r.firstElementChild.insertAdjacentElement("afterend",t)}o.remove(),e.hasOwnProperty("stargazers_count")&&console.log("TCL: starCount",e.stargazers_count)})}();