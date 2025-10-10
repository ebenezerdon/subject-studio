/* scripts/ui.js
   Responsibility: UI rendering, event binding, and exposing App.init and App.render on window.App
*/
(function(window, $){
  window.App = window.App || {};

  // Internal UI module state
  const state = {
    subjects: [],
    settings: {},
    current: ''
  };

  // Format relative time for meta
  function nowStamp(){ return new Date().toLocaleString(); }

  // Render history list
  function renderHistory(){
    const $list = $('#history-list').empty();
    const subjects = state.subjects || [];
    if(subjects.length === 0){ $list.append('<div class="text-sm text-gray-400">No saved subjects yet.</div>'); return; }

    const $tmpl = $($('#history-item-template').html());

    subjects.slice().reverse().forEach(function(item, idx){
      const $item = $tmpl.clone();
      $item.find('.subject-title').text(item.text);
      $item.find('.subject-meta').text(item.meta || nowStamp());

      $item.find('.btn-load-item').on('click', function(){
        $('#subject-input').val(item.text).trigger('input').focus();
      });
      $item.find('.btn-delete-item').on('click', function(){
        const keep = state.subjects.filter(s=>s.id !== item.id);
        state.subjects = keep; window.App.Storage.saveSubjects(keep); renderHistory();
      });

      $list.append($item);
    });
  }

  // Update preview box and badges based on current input value
  function updateFromText(text){
    state.current = text || '';
    const count = window.App.Helpers.charCount(state.current);
    const feedback = window.App.Helpers.lengthFeedback(count);

    // update length hint
    $('#length-hint').text(`${count} characters`);
    const $badge = $('#length-badge').removeClass('length-good length-caution length-bad');
    if(feedback.level === 'good') $badge.addClass('length-good').text('Optimal');
    if(feedback.level === 'caution') $badge.addClass('length-caution').text('Caution');
    if(feedback.level === 'bad') $badge.addClass('length-bad').text('Too long');

    // tone hints
    const tones = window.App.Helpers.analyzeTone(state.current);
    const toneHtml = tones.map(t=>`<div class="mb-1"><strong>${t.label}</strong> <span class="text-gray-600">- ${t.advice}</span></div>`).join('');
    $('#tone-hints').html(toneHtml || 'No hints');

    // suggestions
    const suggestions = window.App.Helpers.suggestImprovements(state.current);
    if(suggestions.length===0){ $('#suggestions').text('No suggestions. Great job!'); }
    else{ $('#suggestions').html(suggestions.map(s=>`<div class='mb-1'>${s}</div>`).join('')); }

    // Update preview text and width
    $('#preview-subject').text(state.current || 'Your subject will appear here');

    // If preview width is full, remove width style
    const widthVal = $('#preview-width').val();
    if(widthVal === 'full'){
      $('#preview-wrapper').css('width','100%');
    } else {
      $('#preview-wrapper').css('width', widthVal + 'px');
    }

    // Update title for tooltip
    $('#preview-subject').attr('title', state.current || '');

    // Enable/disable apply suggestion
    $('#btn-apply-suggestion').prop('disabled', suggestions.length===0);
  }

  // Save current subject to storage
  function saveCurrent(){
    const text = state.current || '';
    if(!text.trim()){ alert('Cannot save an empty subject.'); return; }
    const subjects = state.subjects || [];
    const id = 's:' + Date.now();
    subjects.push({ id:id, text: text, meta: nowStamp() });
    state.subjects = subjects;
    try{ window.App.Storage.saveSubjects(subjects); }catch(e){ console.error(e); }
    renderHistory();
    $('#subject-input').trigger('focus');
  }

  // Copy to clipboard
  async function copyCurrent(){
    try{
      await navigator.clipboard.writeText(state.current || '');
      // small confirmation
      const $btn = $('#btn-copy');
      const original = $btn.text();
      $btn.text('Copied');
      setTimeout(()=> $btn.text(original), 1200);
    }catch(e){
      alert('Copy failed. Your browser may block clipboard operations.');
    }
  }

  // Simulate send - logs to console and shows confirmation
  function simulateSend(){
    const record = { text: state.current, time: new Date().toISOString(), previewWidth: $('#preview-width').val() };
    console.log('Simulated send', record);
    alert('Simulated send logged to console.');
  }

  // Apply top suggestion if available
  function applyTopSuggestion(){
    const suggestions = window.App.Helpers.suggestImprovements(state.current);
    if(suggestions.length===0){ alert('No suggestions available'); return; }
    // If the first suggestion contains a quoted shortened example, try to extract and apply
    const s0 = suggestions[0];
    const m = s0.match(/\"(.+)\"/);
    if(m && m[1]){ $('#subject-input').val(m[1]).trigger('input').focus(); }
    else { alert('Top suggestion: ' + s0); }
  }

  // Initialize UI bindings
  function bindEvents(){
    // Input events
    $('#subject-input').on('input', function(){ updateFromText($(this).val()); });

    // Preview width changes
    $('#preview-width').on('change', function(){
      const v = $(this).val();
      state.settings.previewWidth = v;
      window.App.Storage.saveSettings(state.settings);
      updateFromText($('#subject-input').val());
    });

    // Save / Copy / Simulate
    $('#btn-save').on('click', function(){ saveCurrent(); });
    $('#btn-copy').on('click', function(){ copyCurrent(); });
    $('#btn-simulate-send').on('click', function(){ simulateSend(); });
    $('#btn-apply-suggestion').on('click', function(){ applyTopSuggestion(); });
    $('#btn-clear-history').on('click', function(){
      if(confirm('Clear all saved subjects?')){
        state.subjects = []; window.App.Storage.saveSubjects([]); renderHistory();
      }
    });

    // Keyboard shortcuts: Ctrl/Cmd+S to save
    $(window).on('keydown', function(e){
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
        e.preventDefault(); saveCurrent();
      }
    });

    // Load quick load from session if present
    try{
      const quick = sessionStorage.getItem('subject-studio-quick-load');
      if(quick){ $('#subject-input').val(quick).trigger('input'); sessionStorage.removeItem('subject-studio-quick-load'); }
    }catch(e){}
  }

  // Public API
  window.App.init = function(){
    // Load persisted data
    state.subjects = window.App.Storage.loadSubjects() || [];
    state.settings = window.App.Storage.loadSettings() || {};

    // Restore preview width if present
    if(state.settings.previewWidth){ $('#preview-width').val(state.settings.previewWidth); }

    bindEvents();
  };

  window.App.render = function(){
    // Initial render
    renderHistory();

    // Trigger a blank update so defaults display
    updateFromText($('#subject-input').val());

    // Accessibility: focus the input for power users
    $('#subject-input').attr('aria-label','Email subject input');
    setTimeout(function(){ $('#subject-input').focus(); }, 200);
  };

})(window, jQuery);
