'use strict';
const teamScore=document.querySelector('#teamScore');
const teamError=document.querySelector('#teamError');
const positions=[...document.querySelectorAll('.position')];
const grandTotal=document.querySelector('#grandTotal');
const clearButton=document.querySelector('#clearButton');
function parseNonNegativeInteger(text){const value=text.trim();if(!/^\d+$/.test(value))return null;const number=Number(value);return Number.isSafeInteger(number)&&number>=0?number:null}
function parsePosition(text){const number=parseNonNegativeInteger(text);return number!==null&&number>=1&&number<=40?number:null}
function update(){const teamRaw=teamScore.value.trim();const initial=teamRaw===''?0:parseNonNegativeInteger(teamRaw);teamScore.classList.toggle('invalid',teamRaw!==''&&initial===null);teamError.textContent=teamRaw!==''&&initial===null?'Use um número inteiro igual ou maior que zero.':'';let total=initial??0;positions.forEach(input=>{const raw=input.value.trim();const position=parsePosition(raw);const points=position===null?0:51-position;input.classList.toggle('invalid',raw!==''&&position===null);input.closest('tr').querySelector('.points').textContent=String(points);total+=points});grandTotal.textContent=String(total)}
document.addEventListener('input',event=>{if(event.target===teamScore||event.target.matches('.position'))update()});clearButton.addEventListener('click',()=>{teamScore.value='';positions.forEach(input=>input.value='');update();teamScore.focus()});update();
