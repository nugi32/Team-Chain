    <script>
  const menus = document.querySelectorAll('.menu-item');
  const pointer = document.querySelector('.pointer');

  menus.forEach(m => {
    m.onclick = () => {
      menus.forEach(e => e.classList.remove('active'));
      m.classList.add('active');

      const i = m.dataset.i;
      pointer.style.transform = `translateY(${i * 46}px)`;
    }
  })
</script>

    <script>
const openBtn = document.getElementById("openActiveTask");
const modal = document.getElementById("activeTaskModal");
const closeBtn = document.getElementById("closeModal");

openBtn.onclick = () => modal.style.display = "flex";
closeBtn.onclick = () => modal.style.display = "none";

window.onclick = (e) => {
  if(e.target === modal) modal.style.display = "none";
}
</script>


  <div class="menu-item active" data-i="0">🏠 Home</div>
  <div class="menu-item" data-i="1">📦 Orders</div>
  <div class="menu-item" data-i="2">💳 Billing</div>
  <div class="menu-item" data-i="3">⚙️ Settings</div>

  


.nav-modern {
  position: relative;
  width: 240px;
  padding: 20px 0;
  background: rgba(255,255,255,0.03);
  border-radius: 14px;
  backdrop-filter: blur(12px);
}

.menu-item {
  padding: 14px 18px;
  cursor: pointer;
  color: #aab3c8;
  font-size: 15px;
  transition: color .25s;
}

.menu-item.active {
  color: white;
}

.pointer {
  position: absolute;
  left: -6px;
  width: 8px;
  height: 36px;
  background: linear-gradient(180deg,#7c5cff,#5640ff);
  border-radius: 6px;
  transition: transform .4s cubic-bezier(.3,.8,.25,1);
  box-shadow: 0 0 8px #7c5cff99;
}
