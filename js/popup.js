'use strict';

let patch = getData("patch");
let championList = getData("champions");
let favouriteList = getData("favouriteList") ?? [];
let sortable;
let isEditVisible = false;

function lblClicked() {
    if (isEditVisible) {
        return;
    }

    const attribute = this.getAttribute("data-champion");
    searchChampion(attribute);
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
            if (isEditVisible) {
                addToFavouriteList(ui.item.value);
            } else {
                searchChampion(ui.item.value);
            }
            
            document.getElementById("searchInput").value = "";
        }
    });
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
};

function getData(key) {
    const storedData = localStorage.getItem(key);
    return JSON.parse(storedData);
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

    let iconResponse = await fetch(getChampionUrl(championToAdd.icon));
    let blob = await iconResponse.blob();
    let base64data = await blobToBase64(blob);

    championToAdd.iconBase64 = base64data;

    favouriteList.push(championToAdd);

    saveData("favouriteList", favouriteList);

    updateFavouriteList(favouriteList);
}

function deleteFromFavouriteList(data) {
    if (favouriteList === false) {
        favouriteList = [];
    }

    for (var favourite in favouriteList) {
        if (favouriteList[favourite].name == data) {
            favouriteList.splice(favourite, 1);
        }
    }

    saveData("favouriteList", favouriteList);

    updateFavouriteList(favouriteList);


    if (isEditVisible) {
        toggle();
        if (favouriteList.length > 0) {
            toggle();
        }
    }
}

function toggle() {
    let visibility = "";
    const toggleBtn = document.getElementById("toggleBtn");

    if (isEditVisible) {
        visibility = "hidden";
        toggleBtn.classList.remove('glyphicon-ok');
        toggleBtn.classList.add('glyphicon-edit');
    } else {
        visibility = "visible";
        toggleBtn.classList.remove('glyphicon-edit');
        toggleBtn.classList.add('glyphicon-ok');
    }

    const elements = document.getElementsByClassName('edit');
    for (const element of elements) {
        element.style.visibility = visibility;
    }

    isEditVisible = !isEditVisible;
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

function getChampionUrl(iconPath) {
    return `http://ddragon.leagueoflegends.com/cdn/${patch.patchId}/img/champion/${iconPath}`;
}

function generateChampionHTML(champion) {
    return `
        <li class="list-group-item">
            <div data-champion="${champion.name}" class="Row sortableV1Item">
                <div class="icon noselect">
                    <img src="${champion.iconBase64 ?? getChampionUrl(champion.icon)}" alt="${champion.icon}"></img>
                </div>
                <label class="Column noselect vertical-center championLbl">${champion.name}</label>
                <span class="glyphicon glyphicon-remove edit deleteBtns" data-champion="${champion.name}" style="visibility:hidden; color:red; cursor:pointer;"></span>
                <span class="noselect">&nbsp;&nbsp;</span>
                <span class="glyphicon glyphicon-move my-handle edit" aria-hidden="true" style="visibility:hidden;"></span>
            </div>
        </li>
    `;
}

function updateFavouriteList(champions) {
    const htmlElements = champions.map(champion => generateChampionHTML(champion)).join('');
    document.getElementById("listWithHandle").innerHTML = htmlElements;

    const lbls = document.querySelectorAll(".sortableV1Item");
    const deleteBtns = document.querySelectorAll(".deleteBtns");

    lbls.forEach(lbl => lbl.addEventListener('click', lblClicked));
    deleteBtns.forEach(btn => btn.addEventListener('click', deleteClicked));
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

    document.getElementById('toggleBtn').addEventListener('click', toggle);

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

function searchChampion(champion) {
    var newURL = "https://u.gg/lol/champions/" + champion + "/build";
    chrome.tabs.create({ url: newURL });
}

function searchRole(role) {
    var newURL = "https://u.gg/lol/tier-list?role=" + role;
    chrome.tabs.create({ url: newURL });
}