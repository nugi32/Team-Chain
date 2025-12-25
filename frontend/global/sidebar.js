const navToggle = document.getElementById('navToggle');
const sideNav = document.getElementById('sideNav');
const overlay = document.getElementById('overlay');
const navClose = document.getElementById('navClose');

function openNav(){
  sideNav.classList.add('open');
  overlay.classList.add('visible');
  navToggle.setAttribute('aria-expanded','true');
  sideNav.setAttribute('aria-hidden','false');
}

function closeNav(){
  sideNav.classList.remove('open');
  overlay.classList.remove('visible');
  navToggle.setAttribute('aria-expanded','false');
  sideNav.setAttribute('aria-hidden','true');
}

navToggle.addEventListener('click', ()=>{
  if(sideNav.classList.contains('open')) closeNav(); 
  else openNav();
});

navClose.addEventListener('click', closeNav);
overlay.addEventListener('click', closeNav);

// close on Escape
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closeNav();
});

// 🔥 Close if clicking ANYWHERE outside the sidebar
document.addEventListener('click', (e) => {
  if (sideNav.classList.contains('open')) {
    if (!sideNav.contains(e.target) && !navToggle.contains(e.target)) {
      closeNav();
    }
  }
});
