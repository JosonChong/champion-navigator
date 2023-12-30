'use strict';

let patch = getData("patch");
let championList = getData("champions");
let favouriteList = getData("favouriteList") ?? [];
let sortable;
let isEditing = false;
let shortcutConfigs = getData("shortcutConfigs");
let tierListConfig;
let selectedShortcutId = getData("defaultShortcut");

function lblClicked() {
    if (isEditing) {
        return;
    }

    const championName = this.getAttribute("data-champion");
    const favouriteChampion = favouriteList.find(favouriteChampion => favouriteChampion.name === championName);

    if (favouriteChampion) {
        championShortcutOnclick(favouriteChampion.name, favouriteChampion.defaultShortcutId);
    }
};

function deleteClicked() {
    const attribute = this.getAttribute("data-champion");
    deleteFromFavouriteList(attribute);
};

function roleClicked() {
    const attribute = this.getAttribute("data-role");
    searchRole(attribute);
};

function initAutoComplete(source) {
    $("#searchInput").autocomplete({
        source: function(request, response) {
            var championNameList = source.map(function(champ) {
                return champ['name'];
            });

            var term = $.ui.autocomplete.escapeRegex(request.term),
                startsWithMatcher = new RegExp("^" + term, "i"),
                startsWith = $.grep(championNameList, function(value) {
                    return startsWithMatcher.test(value.label || value.value || value);
                }),
                containsMatcher = new RegExp(term, "i"),
                contains = $.grep(championNameList, function(value) {
                    return $.inArray(value, startsWith) < 0 &&
                        containsMatcher.test(value.label || value.value || value);
                });

            response(startsWith.concat(contains));
        },
        autoFocus: true,
        select: function(event, ui) {
            event.preventDefault();
            if (isEditing) {
                addToFavouriteList(ui.item.value);
            } else {
                redirectToChampionGuide(ui.item.value);
            }
            
            document.getElementById("searchInput").value = "";
        }
    });
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
};

function getData(key) {
    try {
        const storedData = localStorage.getItem(key);
        return JSON.parse(storedData);
    } catch(ex) {
        return null;
    }
};

$(() => {
    $("#searchInput").trigger('focus');
});

async function getAndUpdateLatestPatchData() {
    const response = await fetch("https://ddragon.leagueoflegends.com/realms/na.json");
    const data = await response.json();
    const patchId = data.n.champion;

    let result = { patchId: patchId, updatedTime: new Date().getTime() };
    saveData("patch", result);

    return result;
}

async function updatePatchData() {
    let patchId = await getLatestPatchId();
    updateChampionData(patchId);
    patch = { patchId: patchId, updatedTime: new Date().getTime() };
    document.getElementById("patchId").innerText = patch.patchId;
    saveData("patch", patch);

    return patch;
}

async function getAndUpdateChampionData(patchId) {
    const response = await fetch(`http://ddragon.leagueoflegends.com/cdn/${patchId}/data/en_US/champion.json`);
    const data = await response.json();

    let champions = [];
    for (const c in data.data) {
        champions.push({ name: data.data[c].name, icon: data.data[c].image.full });
    }
    saveData("champions", champions);
    return champions;
}

function updateChampionData(patchId) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var data = JSON.parse(xhr.responseText);
                var champions = [];

                for (var c in data.data) {
                    champions.push({ name: data.data[c].name, icon: data.data[c].image.full });
                }
                saveData("champions", champions);
                resolve(champions);
            }
        };
        xhr.open("GET", "http://ddragon.leagueoflegends.com/cdn/" + patchId + "/data/en_US/champion.json", true);
        xhr.send();
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function addToFavouriteList(championName) {
    if (favouriteList.some(champion => champion.name === championName)) {
        return;
    }

    let championToAdd = championList.find(champion => champion.name === championName);

    if (!championToAdd) {
        console.error(`Champion ${championName} not found!`);
        return;
    }

    let iconResponse = await fetch(getChampionIconUrl(championToAdd.icon));
    let blob = await iconResponse.blob();
    let base64data = await blobToBase64(blob);

    championToAdd.iconBase64 = base64data;
    championToAdd.defaultShortcutId = selectedShortcutId;

    favouriteList.push(championToAdd);

    saveData("favouriteList", favouriteList);

    updateFavouriteList(favouriteList);
}

function deleteFromFavouriteList(data) {
    if (favouriteList.length === 0) {
        return;
    }

    for (const favourite in favouriteList) {
        if (favouriteList[favourite].name == data) {
            favouriteList.splice(favourite, 1);
        }
    }

    saveData("favouriteList", favouriteList);

    updateFavouriteList(favouriteList);
}

function toggle() {
    const toggleBtn = document.getElementById("toggleBtn");

    isEditing = !isEditing;

    if (isEditing) {
        toggleBtn.classList.remove('glyphicon-edit');
        toggleBtn.classList.add('glyphicon-ok');
    } else {
        toggleBtn.classList.remove('glyphicon-ok');
        toggleBtn.classList.add('glyphicon-edit');
    }

    updateFavouriteList(favouriteList);
    // $('.shortcut-grid-or-edit-buttons').each((index, element) => {
    //     let championName = element.parentNode.getAttribute('data-champion');

    //     if (isEditing) {
    //         element.innerHTML = `
    //         <span class="glyphicon glyphicon-remove delete-button" data-champion="${championName}" style="color:red; cursor:pointer;"></span>
    //         <span class="noselect">&nbsp;&nbsp;</span>
    //         <span class="glyphicon glyphicon-move my-handle" aria-hidden="true"></span>`;
    //     }
    // });
}

function initFavouriteList() {
    sortable = Sortable.create(listWithHandle, {
        handle: '.my-handle',
        animation: 150,
        onUpdate: function( /**Event*/ evt, /**Event*/ originalEvent) {
            var data = favouriteList[evt.oldDraggableIndex];
            favouriteList.splice(evt.oldDraggableIndex, 1);
            favouriteList.splice(evt.newDraggableIndex, 0, data);

            //handle list here
            saveData("favouriteList", favouriteList);
        },
        items: favouriteList
    });

}

function getChampionIconUrl(iconPath) {
    return `http://ddragon.leagueoflegends.com/cdn/${patch.patchId}/img/champion/${iconPath}`;
}

function generateShortcutGridHtml(favouriteChampion) {
    let shortcutContents = "";
    for (let [shortcutConfigId, shortcutConfig] of Object.entries(shortcutConfigs)) {
        let isDefaultShortcut = shortcutConfigId === favouriteChampion.defaultShortcutId;
        shortcutContents += `<div data-champion="${favouriteChampion.name}" data-shortcut-id="${shortcutConfigId}" class="shortcut-item ${isDefaultShortcut ? "default-shortcut" : ""}">
                                    <span>${shortcutConfig.name}</span>
                            </div>`;
    }

    return `
    <div class="grid-container">
        ${shortcutContents}
    </div>`;
}

function getEditButtonsHtml(favouriteChampion) {
    return `
    <span class="glyphicon glyphicon-remove edit-button delete-button" data-champion="${favouriteChampion.name}" style="color:red; cursor:pointer;"></span>
    <span class="glyphicon glyphicon-move my-handle edit-button"></span>`;
}

function generateChampionHtml(favouriteChampion) {
    let imageSrc = favouriteChampion.iconBase64 ?? getChampionIconUrl(favouriteChampion.icon);

    return `
    <li class="list-group-item">
        <div data-champion="${favouriteChampion.name}" class="Row sortableV1Item">
            <div class="icon-holder Column">
                <img class="icon noselect nodrag" src="${imageSrc}" alt="${favouriteChampion.icon}"></img>
            </div>
            <label class="Column noselect vertical-center championLbl">${favouriteChampion.name}</label>
            <div class="Column vertical-center shortcut-grid-or-edit-buttons">
                ${isEditing ? getEditButtonsHtml(favouriteChampion) : generateShortcutGridHtml(favouriteChampion)}
            </div>
        </div>
    </li>
    `;
}

function updateFavouriteList(champions) {
    const htmlElements = champions.map(champion => generateChampionHtml(champion)).join('');
    document.getElementById("listWithHandle").innerHTML = htmlElements;

    const lbls = document.querySelectorAll(".sortableV1Item");
    const deleteBtns = document.querySelectorAll(".delete-button");

    lbls.forEach(lbl => lbl.addEventListener('click', lblClicked));
    deleteBtns.forEach(btn => btn.addEventListener('click', deleteClicked));

    document.querySelectorAll(".shortcut-item").forEach(item => item.addEventListener('click', function(e) {
        let championName = this.getAttribute("data-champion");
        let shortcutConfigId = this.getAttribute("data-shortcut-id");
        
        championShortcutOnclick(championName, shortcutConfigId);
        e.stopPropagation();
    }));
}

async function initTierListConfig() {
    let tierListConfigs = getData("tierListConfigs");

    if (!tierListConfigs) {
        let filePath = 'assets/default-tier-list-configs.json';
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filePath}`);
        }
        tierListConfigs = await response.json();

        saveData('tierListConfigs', tierListConfigs);
    }

    tierListConfig = tierListConfigs["tierListSites"][tierListConfigs["defaultTierListSite"]];
}

$(document).ready(async () => {
    if (!patch || !championList) {
        let patchData = await getAndUpdateLatestPatchData();
        let champions = await getAndUpdateChampionData(patchData.patchId);
        championList = champions;

        patch = patchData;
    } else {
        // async check if patchId is updated
        getAndUpdateLatestPatchData().then(patchData => {
            if (patchData.patchId !== patch.patchId) {
                getAndUpdateChampionData(patchData.patchId).then(champions => {
                    championList = champions;
                    patch = patchData;
                    document.getElementById("patchId").innerText = patch.patchId;
                    initAutoComplete(champions);
                    console.log(`Patch data is updated to V${patch.patchId}`);
                });
            }
        });
    }

    let shortcutConfigsNotStored = !shortcutConfigs;
    if (shortcutConfigsNotStored) {
        const response = await fetch('assets/default-shortcut-configs.json');
        if (!response.ok) {
          throw new Error('Failed to fetch the file');
        }
        shortcutConfigs = await response.json();

        saveData('shortcutConfigs', shortcutConfigs);
    }
    
    shortcutConfigs = Object.fromEntries(
        Object.entries(shortcutConfigs)
            .filter(([key, value]) => value.isShow)
    );

    if (shortcutConfigsNotStored) {
        selectedShortcutId = Object.keys(shortcutConfigs)[0];
        saveData('defaultShortcut', selectedShortcutId);
    }

    await initTierListConfig();

    document.getElementById('toggleBtn').addEventListener('click', toggle);

    document.getElementById('optionsLink').addEventListener('click', function() {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL('options.html'));
        }
    });

    let shortcutSelect = document.getElementById('shortcut-options');
    for (let [shortcutId, shortcutConfig] of Object.entries(shortcutConfigs)) {
        let option = document.createElement('option');
        option.value = shortcutId;
        option.innerHTML = shortcutConfig.name;

        if (selectedShortcutId === shortcutId) {
            option.selected = true;
        }

        shortcutSelect.appendChild(option);
    }

    document.getElementById('shortcut-options').addEventListener('change', function() {
        selectedShortcutId = this.value;

        // $('.default-shortcut').removeClass('default-shortcut');

        // $(`div[data-shortcut-id="${selectedShortcutId}"]`).addClass('default-shortcut');

        saveData('defaultShortcut', selectedShortcutId);
    });

    document.getElementById("patchId").innerText = patch.patchId;
    initAutoComplete(championList);

    initFavouriteList();

    if (favouriteList) {
        updateFavouriteList(favouriteList);
    }

    const rolesImgs = document.getElementsByClassName('role');

    for (const rolesImg of rolesImgs) {
        rolesImg.addEventListener('click', roleClicked);
    }
});

function redirectToChampionGuide(championName, url) {
    url = url || shortcutConfigs[selectedShortcutId].url;

    const formattedChampionName = championName === "Nunu & Willump" ? "nunu" : championName.replace(/[ '&]/g, (match) => {
        if (match === " ") return "";
        if (match === "&") return "-";
        return "";
    });

    chrome.tabs.create({ url: url.replace("<champion-name>", formattedChampionName.toLowerCase()) });
}

function championShortcutOnclick(championName, shortcutConfigId) {
    if (!shortcutConfigId) {
        shortcutConfigId = selectedShortcutId;
    }

    redirectToChampionGuide(championName, shortcutConfigs[shortcutConfigId].url);

    for (const favouriteChampion of favouriteList) {
        if (favouriteChampion.name == championName) {
            favouriteChampion.defaultShortcutId = shortcutConfigId;
        }
    }

    saveData("favouriteList", favouriteList);
}

function searchRole(role) {
    let url = tierListConfig[role].url;
    
    if (url) {
        chrome.tabs.create({ url: url });
    } else {
        console.error(`Cannot find tier list url for ${role}.`)
    }
}