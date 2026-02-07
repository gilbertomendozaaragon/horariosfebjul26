(() => {
  const D = window.HORARIOS_DATA;
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  const state = {
    view: "grupos",
    group: "",
    teacher: "",
    room: "",
    day: D.dias[0],
    time: D.horas[0],
    query: ""
  };

  // deterministic color for each docente
  function colorForTeacher(name){
    const s = String(name||"").trim();
    let h = 0;
    for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsla(${hue} 70% 45% / .25)`;
  }
  function dotColorForTeacher(name){
    const s = String(name||"").trim();
    let h = 0;
    for (let i=0;i<s.length;i++) h = (h*33 + s.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 72% 42%)`;
  }

  function uniq(arr){ return [...new Set(arr)].filter(Boolean); }

  function fillSelect(sel, items, placeholder){
    const el = $(sel);
    el.innerHTML = "";
    if (placeholder){
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      el.appendChild(opt);
    }
    for (const it of items){
      const opt = document.createElement("option");
      opt.value = it;
      opt.textContent = it;
      el.appendChild(opt);
    }
  }

  function getClasses(filterFn){
    return D.clases.filter(filterFn);
  }

  function renderGrid(title, classes){
    // build lookup: (hora,dia)-> array
    const lookup = new Map();
    for (const c of classes){
      const key = `${c.hora}||${c.dia}`;
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(c);
    }

    $("#resultTitle").textContent = title;
    const ps = $("#printSub"); if (ps) ps.textContent = title;

    const theadDays = D.dias.map(d => `<th>${d}</th>`).join("");
    let html = `
      <div class="grid-wrap">
        <table class="grid" aria-label="Horario">
          <thead>
            <tr>
              <th>Hora</th>
              ${theadDays}
            </tr>
          </thead>
          <tbody>
    `;

    for (const h of D.horas){
      html += `<tr><td class="time">${h}</td>`;
      for (const d of D.dias){
        const key = `${h}||${d}`;
        const list = lookup.get(key) || [];
        if (!list.length){
          html += `<td></td>`;
          continue;
        }
        // sort with tutoría first? keep stable
        const cards = list.map(c => {
          const dot = c.docente ? `<span class="dot" style="background:${dotColorForTeacher(c.docente)}"></span>` : `<span class="dot" style="background:rgba(0,0,0,.12)"></span>`;
          const badgeClass = c.tutoria ? "badge tut" : "badge";
          const badgeText = c.tutoria ? "TUTORÍA" : (c.tutoria_comp ? "FUNGE COMO TUTOR GRUPAL" : (c.complementaria ? "ACT. COMPLEMENTARIA" : (c.materia || "CLASE")));
          const bg = c.docente ? `style="background:${colorForTeacher(c.docente)}"` : "";
          const metaBits = [];
          if (c.aula) metaBits.push(`Aula: <b>${escapeHtml(c.aula)}</b>`);
          if (c.docente) metaBits.push(`<span>${dot} ${escapeHtml(c.docente)}</span>`);
          if (c.grupo) metaBits.push(`Grupo: <b>${escapeHtml(c.grupo)}</b>`);
          return `
            <div class="classcard" ${bg}>
              <div class="row1">
                <span class="${badgeClass}">${badgeText}</span>
                ${c.aula ? `<span class="kbd">${escapeHtml(c.aula)}</span>` : ``}
              </div>
              <div class="meta">${metaBits.join(" • ")}</div>
            </div>
          `;
        }).join("");
        html += `<td><div class="cardlines">${cards}</div></td>`;
      }
      html += `</tr>`;
    }

    html += `</tbody></table></div>`;
    $("#result").innerHTML = html;
  }

  function renderPrefecture(day, time, query){
    const q = (query||"").trim().toLowerCase();
    const list = D.clases
      .filter(c => c.dia === day && c.hora === time)
      .filter(c => !q || String(c.grupo).toLowerCase().includes(q) || String(c.aula).toLowerCase().includes(q) || String(c.docente).toLowerCase().includes(q) || String(c.materia).toLowerCase().includes(q))
      .sort((a,b) => String(a.grupo).localeCompare(String(b.grupo)));

    $("#resultTitle").textContent = `Prefectura • ${day} • ${time}`;
    const ps = $("#printSub"); if (ps) ps.textContent = `Prefectura • ${day} • ${time}`;

    if (!list.length){
      $("#result").innerHTML = `<div class="hint">No se encontraron grupos para ese filtro.</div>`;
      return;
    }

    const cards = list.map(c => {
      const dot = c.docente ? `<span class="dot" style="background:${dotColorForTeacher(c.docente)}"></span>` : `<span class="dot" style="background:rgba(0,0,0,.12)"></span>`;
      const badgeClass = c.tutoria ? "badge tut" : "badge";
      const badgeText = c.tutoria ? "TUTORÍA" : (c.tutoria_comp ? "FUNGE COMO TUTOR GRUPAL" : (c.complementaria ? "ACT. COMPLEMENTARIA" : (c.materia || "CLASE")));
      const bg = c.docente ? `style="background:${colorForTeacher(c.docente)}"` : "";
      return `
        <div class="pref-item" ${bg}>
          <div class="top">
            <div class="g">${escapeHtml(c.grupo)}</div>
            <span class="kbd">${escapeHtml(c.aula || "")}</span>
          </div>
          <div style="margin-top:10px">
            <span class="${badgeClass}">${badgeText}</span>
          </div>
          <div class="small" style="margin-top:8px">
            ${c.docente ? `${dot} <b>${escapeHtml(c.docente)}</b>` : ``}
            ${c.materia && !c.tutoria ? `<div style="margin-top:4px">${escapeHtml(c.materia)}</div>` : (c.tutoria ? "" : "")}
          </div>
        </div>
      `;
    }).join("");

    $("#result").innerHTML = `<div class="pref-list">${cards}</div>`;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function setView(view){
    state.view = view;
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    // show/hide fields
    $("#fieldGroup").style.display = (view === "grupos") ? "" : "none";
    $("#fieldTeacher").style.display = (view === "docentes") ? "" : "none";
    $("#fieldRoom").style.display = (view === "aulas") ? "" : "none";
    $("#fieldDay").style.display = (view === "prefectura") ? "" : "none";
    $("#fieldTime").style.display = (view === "prefectura") ? "" : "none";
    $("#fieldQuery").style.display = (view === "prefectura") ? "" : "none";
    $("#btnConsultar").textContent = (view === "prefectura") ? "Ver ubicación" : "Consultar";
    $("#hint").textContent = (view === "prefectura")
      ? "Tip: escribe parte del grupo, aula, materia o docente para filtrar rápido."
      : "Tip: puedes cambiar de pestaña para consultar por grupo, docente, aula o prefectura.";
    $("#result").innerHTML = "";
    $("#resultTitle").textContent = "Resultado";
  }

  function consult(){
    const v = state.view;
    if (v === "grupos"){
      const g = $("#selGrupo").value;
      if (!g){ toast("Selecciona un grupo."); return; }
      const classes = getClasses(c => c.grupo === g);
      renderGrid(`Grupo • ${g}`, classes);
      return;
    }
    if (v === "docentes"){
      const t = $("#selDocente").value;
      if (!t){ toast("Selecciona un docente."); return; }
      const classes = getClasses(c => c.docente === t && (!c.tutoria || c.tutoria_comp === true));
      renderGrid(`Docente • ${t}`, classes);
      return;
    }
    if (v === "aulas"){
      const a = $("#selAula").value;
      if (!a){ toast("Selecciona un aula."); return; }
      const classes = getClasses(c => c.aula === a);
      renderGrid(`Aula • ${a}`, classes);
      return;
    }
    if (v === "prefectura"){
      const day = $("#selDia").value;
      const time = $("#selHora").value;
      const q = $("#txtFiltro").value;
      renderPrefecture(day, time, q);
      return;
    }
  }

  // Simple snackbar
  let toastTimer = null;
  function toast(msg){
    const el = $("#snackbar");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> el.classList.remove("show"), 2200);
  }

  function init(){
    fillSelect("#selGrupo", D.grupos, "Selecciona...");
    fillSelect("#selDocente", D.docentes, "Selecciona...");
    fillSelect("#selAula", D.aulas, "Selecciona...");
    fillSelect("#selDia", D.dias, null);
    fillSelect("#selHora", D.horas, null);

    // default selections
    $("#selDia").value = D.dias[0];
    $("#selHora").value = D.horas[0];

    $$(".tab").forEach(tab => tab.addEventListener("click", () => setView(tab.dataset.view)));
    $("#btnConsultar").addEventListener("click", consult);
    $("#btnImprimir").addEventListener("click", () => {
      // Actualiza subtítulo para impresión con el resultado actual
      const rt = $("#resultTitle")?.textContent || "";
      const ps = $("#printSub");
      if (ps) ps.textContent = rt;
      window.print();
    });


    // Enter key for prefectura filter
    $("#txtFiltro").addEventListener("keydown", (e) => {
      if (e.key === "Enter") consult();
    });

    setView("grupos");
  }

  init();
})();
