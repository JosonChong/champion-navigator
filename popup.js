'use strict';

var patch;

var favouriteList;

var sortable;

var sortableV2;

var isEditVisible = false;

var lblClicked = function() {
    var attribute = this.getAttribute("data-champion");
    searchChampion(attribute);
};

var deleteClicked = function() {
    var attribute = this.getAttribute("data-champion");
    console.log(attribute);
    deleteFromFavouriteList(attribute);
};

var roleClicked = function() {
    var attribute = this.getAttribute("data-role");
    searchRole(attribute);
};

function addAutoComplete(source) {
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
            searchChampion(ui.item.value);
            document.getElementById("searchInput").value = "";
        }
    });

    $("#favouriteInput").autocomplete({
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
            addToFavouriteList(ui.item.value)
            document.getElementById("favouriteInput").value = "";
        }
    });
}

var saveData = function(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

var getData = function(key) {
    if (localStorage.getItem(key) != null) {
        return JSON.parse(localStorage.getItem(key));
    } else {
        return false;
    }
}

$(function() {
    $("#searchInput").focus();
});

document.addEventListener('DOMContentLoaded', function() {
    var link = document.getElementById('downloadBtn');

    link.addEventListener('click', function() {
        updatePatchData();
    });
});

function updatePatchData() {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var data = JSON.parse(xhr.responseText);
                updateChampionData(data.n.champion);
                patch = { patchId: data.n.champion, updatedTime: Date() };
                document.getElementById("patchId").innerText = patch.patchId;
                saveData("patch", patch);
                resolve(patch);
            }
        };
        xhr.open("GET", "https://ddragon.leagueoflegends.com/realms/na.json", true);
        xhr.send();
    });
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

function addToFavouriteList(data) {
    var champions = getData("champions");

    for (var c in champions) {
        if (data === champions[c].name) {
            data = { name: champions[c].name, icon: champions[c].icon }
        }
    }

    favouriteList = getData("favouriteList");

    if (favouriteList === false) {
        favouriteList = [];
    }

    var containInList = false;
    for (var favourite in favouriteList) {
        if (favouriteList[favourite].name === data.name) {
            containInList = true;
            break;
        }
    }

    if (!containInList) {
        favouriteList.push(data);
    }

    saveData("favouriteList", favouriteList);

    updateFavouriteList(favouriteList);
}

function deleteFromFavouriteList(data) {
    var favouriteList = getData("favouriteList");

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
    var visibility = "";
    var toggleBtn = document.getElementById("toggleBtn");

    if (isEditVisible) {
        // sortableV2.option("disabled", true);
        visibility = "hidden";
        toggleBtn.innerHTML = '<span class="glyphicon glyphicon-edit"></span> Edit';
    } else {
        // sortableV2.option("disabled", false);

        visibility = "visible";
        toggleBtn.innerHTML = '<span style="color:green" class="glyphicon glyphicon-ok"></span> Done';
    }

    var elems = document.getElementsByClassName('edit');
    for (var i = 0; i != elems.length; ++i) {
        elems[i].style.visibility = visibility;
    }

    var v1Items = document.getElementsByClassName('sortableV1Item');

    for (var i = 0; i < v1Items.length; i++) {
        if (isEditVisible) {
            v1Items[i].addEventListener('click', lblClicked);
        } else {
            v1Items[i].removeEventListener('click', lblClicked);
        }
    }

    isEditVisible = !isEditVisible;
}

function addFavouriteList() {
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

function updateFavouriteList(list) {
    var txt = "";
    var baseUrl = "http://ddragon.leagueoflegends.com/cdn/" + patch.patchId + "/img/champion/"

    for (var i in list) {
        console.log("list[i].name: " + list[i].name);
        txt += '<li class="list-group-item"><div data-champion="' + list[i].name + '" class="Row sortableV1Item">' +
            '<div class="icon noselect"><img src="' + baseUrl + list[i].icon + '"></img></div>' +
            '<label class="Column noselect vertical-center championLbl">' + list[i].name + '</label>' +
            '<div class="Column right"></div><span class="glyphicon' +
            ' glyphicon-remove edit deleteBtns"data-champion="' + list[i].name + '" style="visibility:hidden; ' +
            'color:red; cursor:pointer;"></span>' +
            '<span class="noselect">&nbsp;&nbsp;</span><span ' +
            'class="glyphicon glyphicon-move my-handle' +
            ' edit" aria-hidden="true" style="visibility:hidden;">' +
            '</span></div></li>'
    }

    document.getElementById("listWithHandle").innerHTML = txt;

    var lbls = document.getElementsByClassName("sortableV1Item");
    var deleteBtn = document.getElementsByClassName("deleteBtns");

    for (var i = 0; i < list.length; i++) {
        lbls[i].addEventListener('click', lblClicked);
        deleteBtn[i].addEventListener('click', deleteClicked);
    }

    if (list.length > 0) {
        document.getElementById("toggleBtn").disabled = false;
    } else {
        document.getElementById("toggleBtn").disabled = true;
    }
}

$(document).ready(function() {
    patch = getData("patch");
    console.log("Current patchId: " + patch.patchId);
    if (patch === false) {
        updatePatchData().then(result => {
            console.log(result);
            updateChampionData(result.patchId).then(champions => {
                console.log(champions);
                addAutoComplete(champions);
            });
        });
    } else {
        document.getElementById("patchId").innerText = patch.patchId;
        addAutoComplete(getData("champions"));
    }

    // saveData("favouriteList", false);
    favouriteList = getData("favouriteList");
    addFavouriteList();

    if (favouriteList !== false) {
        updateFavouriteList(favouriteList);

        document.getElementById('toggleBtn').addEventListener('click', function() {
            toggle();
        });
    }

    var rolesImgs = document.getElementsByClassName('role');

    for (var i = 0; i < rolesImgs.length; i++) {
        rolesImgs[i].addEventListener('click', roleClicked);
    }

    document.getElementById('menuDownBtn').addEventListener('click', function() {
        document.getElementById('menuDownDiv').style.display = "none";
        document.getElementById('favouriteDiv').style.display = "block";
        document.getElementById('menuUpDiv').style.display = "block";
    });

    document.getElementById('menuUpBtn').addEventListener('click', function() {
        document.getElementById('menuUpDiv').style.display = "none";
        document.getElementById('favouriteDiv').style.display = "none";
        document.getElementById('menuDownDiv').style.display = "block";
    });
});

function searchChampion(champion) {
    var newURL = "https://u.gg/lol/champions/" + champion + "/build";
    chrome.tabs.create({ url: newURL });
}

function searchRole(role) {
    var newURL = "https://u.gg/lol/tier-list?role=" + role;
    chrome.tabs.create({ url: newURL });
}