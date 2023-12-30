$(document).ready(function() {
  const form = $('#options-form');
  const urlsContainer = $('#urls-container');
  const addUrlBtn = $('#add-url-btn');

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

  function addUrlPair(configId, name, url, isShow) {
    urlsContainer.append(createUrlPair(configId, name, url, isShow));
  }

  addUrlBtn.click(function() {
    addUrlPair();
  });

  form.submit(function(event) {
    event.preventDefault();

    const checkedShowCheckboxes = urlsContainer.find('.show-checkbox:checked');
    if (checkedShowCheckboxes.length > 4) {
      showErrorMessage('Please select at most 4 URLs to display.');
      return;
    }

    let isValid = true;
    let shortcutConfigs = {};

    urlsContainer.find('.url-pair').each(function() {
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

      let config = { name: nameInput, url: urlInput, isShow: isShow }
      shortcutConfigs[id] = config;
    });

    if (isValid) {
      localStorage.setItem("shortcutConfigs", JSON.stringify(shortcutConfigs));

      showSuccessMessage("Options saved.");
    }
  });

  function showErrorMessage(message) {
    console.log(message);
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

  let storedConfigs = JSON.parse(localStorage.getItem("shortcutConfigs"));
  for (const [storedConfigId, storedConfig] of Object.entries(storedConfigs)) {
    addUrlPair(storedConfigId, storedConfig.name, storedConfig.url, storedConfig.isShow)
  }
});
