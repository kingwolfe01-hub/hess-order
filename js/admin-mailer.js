/**
 * 何嘉仁經銷商後台 - 學校經辦 PDF 批次郵件推播模組 (admin-mailer.js)
 * 功用：
 * 1. 同步當前學期經辦名冊與今日發信額度 (JSONP)
 * 2. PDF 附件拖曳上傳與 Base64 轉換
 * 3. 批次推播與個人化稱謂客製發信
 * 4. 資安防護 (escapeHtml)、真實異常回報與端點統一
 */

(function(window) {
  'use strict';

  let fetchedSchools = [];
  let selectedSchools = new Set();
  let currentPdfBase64 = null;
  let currentPdfFileName = "";

  function getGasApiUrl() {
    return window.GAS_URL || window.DEFAULT_PRIMARY_GAS_URL;
  }

  function escapeHtml(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function extractContactsFromLoadedOrders() {
    const orders = window.allOrders || window.allOrdersData || [];
    const map = new Map();
    orders.forEach(o => {
      const school = String(o.school || o.schoolName || o['學校名稱'] || '').replace(/國民小學|國小/g, '').trim();
      const email = String(o.contactEmail || o['email'] || o['承辦信箱'] || o.email || '').trim();
      const district = String(o.schoolDistrict || o['鄉鎮市區'] || '').trim();
      const contactPerson = String(o.contactPerson || o['承辦人'] || o['承辦人員'] || '').trim();
      if (school && email && email.includes('@') && !map.has(school)) {
        map.set(school, { school, district, contactPerson, email });
      }
    });
    return Array.from(map.values());
  }

  function fetchContacts() {
    const termSelect = document.getElementById('selectTerm');
    const term = termSelect ? termSelect.value : '115-2';
    const tbody = document.getElementById('mailerSchoolTbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">⏳ 正在同步【${escapeHtml(term)}】學校經辦聯絡人與發信配額...</td></tr>`;

    const callbackName = 'jsonp_mailer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const apiUrl = getGasApiUrl();

    let isDone = false;
    const timer = setTimeout(() => {
      if (isDone) return;
      isDone = true;
      fallbackToLoadedOrders();
    }, 15000);

    function fallbackToLoadedOrders() {
      delete window[callbackName];
      const sc = document.getElementById(callbackName);
      if (sc) sc.remove();

      fetchedSchools = extractContactsFromLoadedOrders();
      const qDisp = document.getElementById('mailerQuotaDisplay');
      if (qDisp) qDisp.textContent = "依帳號配額";
      const bQuota = document.getElementById('badgeMailerQuota');
      if (bQuota) bQuota.textContent = `${fetchedSchools.length} 校就緒`;

      const tCount = document.getElementById('mailerTotalCount');
      if (tCount) tCount.textContent = fetchedSchools.length;
      buildDistrictOptions();
      selectedSchools = new Set(fetchedSchools.map(s => s.school));
      renderSchoolList();
    }

    window[callbackName] = function(json) {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      delete window[callbackName];
      const scriptElem = document.getElementById(callbackName);
      if (scriptElem) scriptElem.remove();

      if (json && json.status === 'success') {
        fetchedSchools = json.schools || [];
        const quotaText = `${json.remainingQuota !== undefined ? json.remainingQuota : 100} 封`;
        const qDisp = document.getElementById('mailerQuotaDisplay');
        if (qDisp) qDisp.textContent = quotaText;
        const bQuota = document.getElementById('badgeMailerQuota');
        if (bQuota) bQuota.textContent = `餘 ${quotaText}`;
      } else {
        fetchedSchools = extractContactsFromLoadedOrders();
        const qDisp = document.getElementById('mailerQuotaDisplay');
        if (qDisp) qDisp.textContent = "依帳號配額";
        const bQuota = document.getElementById('badgeMailerQuota');
        if (bQuota) bQuota.textContent = `${fetchedSchools.length} 校就緒`;
      }

      const tCount = document.getElementById('mailerTotalCount');
      if (tCount) tCount.textContent = fetchedSchools.length;
      buildDistrictOptions();
      selectedSchools = new Set(fetchedSchools.map(s => s.school));
      renderSchoolList();
    };

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `${apiUrl}?action=getSchoolContacts&term=${encodeURIComponent(term)}&callback=${callbackName}`;
    script.onerror = function() {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      fallbackToLoadedOrders();
    };
    document.body.appendChild(script);
  }

  function buildDistrictOptions() {
    const select = document.getElementById('mailerDistrictFilter');
    if (!select) return;
    const districts = Array.from(new Set(fetchedSchools.map(s => s.district))).filter(Boolean);
    select.innerHTML = `<option value="ALL">全縣市 / 所有鄉鎮市區 (${fetchedSchools.length}校)</option>` +
      districts.map(d => {
        const count = fetchedSchools.filter(s => s.district === d).length;
        return `<option value="${escapeHtml(d)}">${escapeHtml(d)} (${count}校)</option>`;
      }).join('');
  }

  function renderSchoolList() {
    const distEl = document.getElementById('mailerDistrictFilter');
    const searchEl = document.getElementById('mailerSearchInput');
    const tbody = document.getElementById('mailerSchoolTbody');
    if (!tbody) return;

    const dist = distEl ? distEl.value : 'ALL';
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';

    const filtered = fetchedSchools.filter(s => {
      const matchDist = (dist === 'ALL' || s.district === dist);
      const matchQ = !q || (s.school && s.school.toLowerCase().includes(q)) || (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) || (s.email && s.email.toLowerCase().includes(q));
      return matchDist && matchQ;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">查無具備有效 Email 之相符學校（請確認訂單總表內是否有填寫承辦信箱）</td></tr>`;
      updateCountDisplay();
      return;
    }

    // ★ BUG 10 修復：全面採用 escapeHtml，並改用 data-school 避免引號語法中斷或 XSS
    tbody.innerHTML = filtered.map(s => {
      const isChecked = selectedSchools.has(s.school);
      return `
        <tr class="hover:bg-slate-50 transition cursor-pointer" data-school="${escapeHtml(s.school)}" onclick="AdminMailer.toggleSchoolRow(this, event)">
          <td class="py-2 px-3 text-center" onclick="event.stopPropagation()">
            <input type="checkbox" value="${escapeHtml(s.school)}" ${isChecked ? 'checked' : ''} onchange="AdminMailer.onSchoolCheckChange(this.value, this.checked)" class="accent-red-600 rounded cursor-pointer">
          </td>
          <td class="py-2 px-2 text-slate-500">${escapeHtml(s.district || '-')}</td>
          <td class="py-2 px-2 font-bold text-slate-900">${escapeHtml(s.school)}國小</td>
          <td class="py-2 px-2 text-slate-700">${escapeHtml(s.contactPerson || '承辦老師')}</td>
          <td class="py-2 px-3 font-mono text-[11px] text-blue-600">${escapeHtml(s.email)}</td>
        </tr>
      `;
    }).join('');

    updateCountDisplay();
  }

  function onSchoolCheckChange(schoolName, checked) {
    if (checked) selectedSchools.add(schoolName);
    else selectedSchools.delete(schoolName);
    updateCountDisplay();
  }

  function toggleSchoolRow(rowElem, e) {
    if (e && e.target && e.target.tagName.toLowerCase() === 'input') return;
    const schoolName = rowElem.getAttribute('data-school');
    if (!schoolName) return;

    if (selectedSchools.has(schoolName)) selectedSchools.delete(schoolName);
    else selectedSchools.add(schoolName);

    const cb = rowElem.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = selectedSchools.has(schoolName);
    updateCountDisplay();
  }

  function toggleSelectAll(select) {
    const dist = document.getElementById('mailerDistrictFilter')?.value || 'ALL';
    const q = (document.getElementById('mailerSearchInput')?.value || '').trim().toLowerCase();

    fetchedSchools.forEach(s => {
      const matchDist = (dist === 'ALL' || s.district === dist);
      const matchQ = !q || (s.school && s.school.toLowerCase().includes(q)) || (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) || (s.email && s.email.toLowerCase().includes(q));
      if (matchDist && matchQ) {
        if (select) selectedSchools.add(s.school);
        else selectedSchools.delete(s.school);
      }
    });

    const chkHeader = document.getElementById('mailerChkAllHeader');
    if (chkHeader) chkHeader.checked = select;
    renderSchoolList();
  }

  function updateCountDisplay() {
    const c1 = document.getElementById('mailerSelectedCount');
    const c2 = document.getElementById('mailerSendCount');
    if (c1) c1.textContent = selectedSchools.size;
    if (c2) c2.textContent = selectedSchools.size;

    const chkHeader = document.getElementById('mailerChkAllHeader');
    if (chkHeader && fetchedSchools.length > 0) {
      chkHeader.checked = (selectedSchools.size === fetchedSchools.length);
    }
  }

  function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== "application/pdf") {
      alert("⚠️ 請選擇正確的 PDF 格式檔案 (.pdf)！");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("⚠️ PDF 檔案過大（超過 8MB 上限），請先壓縮或分批上傳！");
      return;
    }

    currentPdfFileName = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
      currentPdfBase64 = e.target.result.split(',')[1];
      document.getElementById('mailerUploadPrompt').classList.add('hidden');
      document.getElementById('mailerFileInfo').classList.remove('hidden');
      document.getElementById('mailerFileName').textContent = file.name;
      document.getElementById('mailerFileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    };
    reader.readAsDataURL(file);
  }

  function clearPdf(e) {
    if (e) e.stopPropagation();
    currentPdfBase64 = null;
    currentPdfFileName = "";
    document.getElementById('mailerPdfInput').value = "";
    document.getElementById('mailerUploadPrompt').classList.remove('hidden');
    document.getElementById('mailerFileInfo').classList.add('hidden');
  }

  async function startBatchSend() {
    if (!currentPdfBase64) {
      alert("⚠️ 請先於「步驟 1」上傳要附帶發送的 PDF 檔案！");
      return;
    }
    if (selectedSchools.size === 0) {
      alert("⚠️ 請於右側名冊至少勾選一所要發送的學校！");
      return;
    }

    const targets = fetchedSchools.filter(s => selectedSchools.has(s.school));
    const subject = document.getElementById('mailerSubject').value.trim();
    const body = document.getElementById('mailerBody').value.trim();

    const confirmMsg = `即將發送電子郵件與 PDF 附件至【${targets.length} 所學校經辦人】：\n\n• 附件檔案：${currentPdfFileName}\n• 信件主旨：${subject}\n\n是否確定立即發送？`;
    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById('btnMailerSend');
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin">⏳</span> 正在透過雲端發送郵件中 (請勿關閉視窗)...`;

    const payload = {
      action: "sendBatchEmails",
      subject: subject,
      body: body,
      pdfBase64: currentPdfBase64,
      pdfFileName: currentPdfFileName,
      recipients: targets
    };

    try {
      const res = await fetch(getGasApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result && result.status === 'completed') {
        alert(`🎉 批次發送完成！\n\n• 成功寄出：${result.successCount} 封\n• 失敗：${result.failureCount} 封\n• 今日剩餘配額：${result.remainingQuota} 封`);
        const qDisp = document.getElementById('mailerQuotaDisplay');
        if (qDisp) qDisp.textContent = `${result.remainingQuota} 封`;
        const bQuota = document.getElementById('badgeMailerQuota');
        if (bQuota) bQuota.textContent = `餘 ${result.remainingQuota} 封`;
      } else {
        alert(`❌ 發送異常：${result.message || result.error || '請確認後端 Code.gs 已部署最新版本'}`);
      }
    } catch (err) {
      // ★ BUG 4 修復：誠實回報異常，絕不跳出假成功提示！
      console.error("發信連線失敗:", err);
      alert(`❌ 發信連線失敗：${err.message || "網路異常或 PDF 檔案過大遭阻擋"}\n\n請確認 Google Apps Script Web App 已正確部署並開放所有人存取。`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>🚀</span> 立即執行批次發送 (<span id="mailerSendCount">${selectedSchools.size}</span> 校)`;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('mailerDropZone');
    if (dropZone) {
      dropZone.onclick = () => document.getElementById('mailerPdfInput').click();
      dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-red-500'); };
      dropZone.ondragleave = () => dropZone.classList.remove('border-red-500');
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-red-500');
        handleFileSelect(e.dataTransfer.files);
      };
    }
  });

  window.AdminMailer = {
    fetchContacts,
    renderSchoolList,
    onSchoolCheckChange,
    toggleSchoolRow,
    toggleSelectAll,
    handleFileSelect,
    clearPdf,
    startBatchSend
  };

})(window);
