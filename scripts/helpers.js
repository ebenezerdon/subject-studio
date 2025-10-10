/* scripts/helpers.js
   Responsibility: provide pure utility functions and localStorage helpers attached to window.App.Helpers and window.App.Storage
*/
(function(window, $){
  window.App = window.App || {};
  const Helpers = {};

  // Safe localStorage wrapper with graceful degradation
  const Storage = {
    _key: 'subject-studio:v1',
    _settingsKey: 'subject-studio:settings:v1',
    loadSubjects: function(){
      try{
        const raw = localStorage.getItem(this._key);
        return raw ? JSON.parse(raw) : [];
      }catch(e){
        console.error('Storage loadSubjects failed', e);
        return [];
      }
    },
    saveSubjects: function(list){
      try{ localStorage.setItem(this._key, JSON.stringify(list || [])); }catch(e){ console.error('Storage saveSubjects failed', e); }
    },
    loadSettings: function(){
      try{ const raw = localStorage.getItem(this._settingsKey); return raw?JSON.parse(raw):{}; }catch(e){ return {}; }
    },
    saveSettings: function(settings){
      try{ localStorage.setItem(this._settingsKey, JSON.stringify(settings || {})); }catch(e){}
    }
  };

  // Count characters and provide recommended ranges
  Helpers.charCount = function(text){
    if (typeof text !== 'string') text = '';
    return Array.from(text).length; // support unicode
  };

  // Very small heuristic to estimate if subject is too long for typical email clients
  Helpers.lengthFeedback = function(count){
    // Guidelines: optimal <= 50, caution 51-80, bad >80
    if (count <= 50) return {level:'good', message:'Optimal length'};
    if (count <= 80) return {level:'caution', message:'Caution: may truncate on mobile'};
    return {level:'bad', message:'Too long: will truncate in many clients'};
  };

  // Simple tone analysis based on keywords and punctuation
  Helpers.analyzeTone = function(text){
    const lower = (text||'').toLowerCase();
    const hints = [];
    // Urgency
    if(/\b(now|today|urgent|hurry|limited|last chance)\b/.test(lower) || /!/.test(text)){
      hints.push({tone:'urgent', label:'Urgent', advice:'May feel pushy. Reserve for true urgency.'});
    }
    // Polite / friendly
    if(/\b(please|welcome|thanks|thank you|hey|hi|hello)\b/.test(lower) || /🙂|😊/.test(text)){
      hints.push({tone:'friendly', label:'Friendly', advice:'Warm and approachable.'});
    }
    // Question
    if(/\?$/.test(text.trim())){
      hints.push({tone:'curious', label:'Question', advice:'Questions can increase opens when relevant.'});
    }
    // Salesy
    if(/\b(free|buy now|sale|save|discount|deal)\b/.test(lower)){
      hints.push({tone:'sales', label:'Salesy', advice:'May trigger spam filters. Consider softer language.'});
    }
    if(hints.length===0){ hints.push({tone:'neutral', label:'Neutral', advice:'Clear and neutral tone.'}); }
    return hints;
  };

  // Suggest simple shortenings or rewordings
  Helpers.suggestImprovements = function(text){
    const suggestions = [];
    if(!text || !text.trim()) return suggestions;

    // If ! present, suggest removing to tone down urgency
    if(text.includes('!')){
      suggestions.push('Consider removing exclamation marks to reduce urgency.');
    }

    // If long, propose a shortened example
    const count = Helpers.charCount(text);
    if(count > 80){
      const shortened = text.slice(0, 77).replace(/[\s,:;-]+$/,'') + '...';
      suggestions.push(`Shorten to: "${shortened}"`);
    } else if(count > 50){
      const shortened = text.slice(0, 50).replace(/[\s,:;-]+$/,'') + '...';
      suggestions.push(`Try shorter: "${shortened}"`);
    }

    // If uses heavy sales words, suggest softer alternative
    const lower = text.toLowerCase();
    if(/\b(buy now|sale|free|save)\b/.test(lower)){
      suggestions.push('Try softer phrasing like "Limited time offer" or "Special savings".');
    }

    // If includes 'last step', suggest clarity
    if(/last step/.test(lower)){
      suggestions.push('Make the action clear: who should do what and why.');
    }

    return suggestions;
  };

  // Estimate pixel width for a subject with a given font size and family by using average char width heuristic.
  // This is not precise but good enough to toggle preview widths and indicate truncation.
  Helpers.estimatePixelWidth = function(text, options){
    options = options || {};
    const avgChar = options.avgChar || 7.2; // px per char at default font size
    const padding = options.padding || 0; // additional padding
    const len = Helpers.charCount(text || '');
    return Math.round(len * avgChar + padding);
  };

  // Attach to window.App
  window.App.Helpers = Helpers;
  window.App.Storage = Storage;

})(window, jQuery);
