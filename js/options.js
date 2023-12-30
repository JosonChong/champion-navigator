function showErrorMessage(message) {
  const errorStatus = $(`<div class="alert alert-danger mt-3"><pre>${message}</pre></div>`);
  $('.container').append(errorStatus);
  setTimeout(function() {
    errorStatus.fadeOut('slow');
    errorStatus.remove();
  }, 2000);
}

function showSuccessMessage(message) {
  const errorStatus = $(`<div class="alert alert-success mt-3">${message}</div>`);
  $('.container').append(errorStatus);
  setTimeout(function() {
    errorStatus.fadeOut('slow');
    errorStatus.remove();
  }, 3000);
}

function exportConfigsToFile() {
  const tierListConfigs = JSON.parse(localStorage.getItem("tierListConfigs"));
  const shortcutConfigs = JSON.parse(localStorage.getItem("shortcutConfigs"));

  const exportData = {
    tierListConfigs: tierListConfigs,
    shortcutConfigs: shortcutConfigs
  };
  
  const exportFileName = "configs.json";
  const exportBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });

  const downloadLink = document.createElement("a");
  const url = URL.createObjectURL(exportBlob);
  downloadLink.href = url;
  downloadLink.download = exportFileName;

  document.body.appendChild(downloadLink);
  downloadLink.click();

  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

function importConfigsFromFile() {
  const fileInput = $('<input type="file" accept=".json" style="display: none;">');

  fileInput.on('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        const tierListConfigs = importedData.tierListConfigs;
        const shortcutConfigs = importedData.shortcutConfigs;

        if (tierListConfigs && tierListConfigs.defaultTierListSite && tierListConfigs.tierListSites[tierListConfigs.defaultTierListSite]) {
            localStorage.setItem("tierListConfigs", JSON.stringify(tierListConfigs));
            showSuccessMessage("Tier list configs updated successfully.");
        } else {
          showErrorMessage("Invalid format of tier list configs.");
        }

        if (shortcutConfigs) {
          if (Object.values(shortcutConfigs).some(value => value.isShow)) {
            localStorage.setItem("shortcutConfigs", JSON.stringify(shortcutConfigs));
            showSuccessMessage("Shortcut configs updated successfully.");
          } else {
            showErrorMessage("Shortcut list is empty or there are no visible shortcuts.");
          }
        } else {
          showErrorMessage("Invalid format of shortcut configs.");
        }
      } catch (error) {
        showErrorMessage("Invalid file format. Please select a valid JSON file.");
      }
    };
    reader.readAsText(file);
  });

  fileInput.click();
}

function createUrlPair(configId, name, url, isShow) {
  if (!configId) {
    configId = crypto.randomUUID();
  }

  const urlPair = $(`
  <div class="url-pair" id="${configId}">
    <input type="text" class="form-control name-input" value="${name ?? ""}" placeholder="Name">
    <input type="text" class="form-control url-input" value="${url ?? ""}" placeholder="Url">
    <input id="show-checkbox-${configId}" type="checkbox" class="show-checkbox" ${isShow !== false ? "checked" : ""}>
    <label for="show-checkbox-${configId}" class="show-label">Show?</label>
    <button type="button" class="btn btn-danger delete-btn">Delete</button>
  </div>
  `);

  urlPair.find('.delete-btn').click(function() {
    $(this).parent('.url-pair').remove();
  });

  return urlPair;
}

function initPage() {
  const form = $('#options-form');
  const tierListUrlsContainer = $('#tier-list-urls-container');
  const shortcutUrlsContainer = $('#shortcut-urls-container');
  const addUrlBtn = $('#add-url-btn');

  $('#export-btn').click(function() {
    exportConfigsToFile();
  });

  $('#import-btn').click(function() {
    importConfigsFromFile();
  });

  function addUrlPair(configId, name, url, isShow) {
    shortcutUrlsContainer.append(createUrlPair(configId, name, url, isShow));
  }

  addUrlBtn.click(function() {
    addUrlPair();
  });

  form.submit(function(event) {
    event.preventDefault();

    const checkedShowCheckboxes = shortcutUrlsContainer.find('.show-checkbox:checked');
    if (checkedShowCheckboxes.length > 4) {
      showErrorMessage('Please select at most 4 url to display.');
      return;
    } else if (checkedShowCheckboxes.length === 0) {
      showErrorMessage('Please select at least 1 url to display.');
      return;
    }

    let isValid = true;
    let tierListConfigs = { "defaultTierListSite": "default", "tierListSites": { "default": {} } };
    let shortcutConfigs = {};

    let defaultTierListConfig = {}
    tierListUrlsContainer.find('.role-input').each(function() {
      const id = $(this).attr('id');      
      const urlInput = $(this).find('.role-url-input').val();

      if (!urlInput) {
        showErrorMessage('Please provide a URL for all Names.');
        isValid = false;
        return false;
      }

      defaultTierListConfig[id] = { url: urlInput };
    });

    tierListConfigs["tierListSites"]["default"] = defaultTierListConfig;

    shortcutUrlsContainer.find('.url-pair').each(function() {
      const id = $(this).attr('id');      
      const urlInput = $(this).find('.url-input').val();
      const nameInput = $(this).find('.name-input').val();
      const isShow = $(this).find('.show-checkbox').prop('checked');

      if (!nameInput) {
        showErrorMessage('Please provide a name for all URLs.');
        isValid = false;
        return false;
      }

      if (!urlInput) {
        showErrorMessage('Please provide a URL for all Names.');
        isValid = false;
        return false;
      }

      if (urlInput.indexOf('<champion-name>') === -1) {
        showErrorMessage('Urls must contain &lt;champion-name&gt;.');
        isValid = false;
        return false;
      }

      let shortcutConfig = { name: nameInput, url: urlInput, isShow: isShow }
      shortcutConfigs[id] = shortcutConfig;
    });

    if (isValid) {
      localStorage.setItem("shortcutConfigs", JSON.stringify(shortcutConfigs));
      localStorage.setItem("tierListConfigs", JSON.stringify(tierListConfigs));

      showSuccessMessage("Options saved.");
    }
  });

  let storedTierListConfigs = JSON.parse(localStorage.getItem("tierListConfigs"));
  let defaultTierListConfig = storedTierListConfigs.tierListSites[storedTierListConfigs.defaultTierListSite];
  for (const [tierListId, tierListConfig] of Object.entries(defaultTierListConfig)) {
    tierListUrlsContainer.find(`#${tierListId}`).find('.role-url-input').val(tierListConfig.url);
  }

  let storedShortcutConfigs = JSON.parse(localStorage.getItem("shortcutConfigs"));
  for (const [storedConfigId, storedConfig] of Object.entries(storedShortcutConfigs)) {
    addUrlPair(storedConfigId, storedConfig.name, storedConfig.url, storedConfig.isShow);
  }
}

$(document).ready(function() {
  initPage();
});