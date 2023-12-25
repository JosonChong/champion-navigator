'use strict';

var patch;

var list;

var sortable;

var sortableV2;

function addAutoComplete(source) {
    $("#tags").autocomplete({
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
            if (document.getElementById("favouriteMode").checked) {
                addToFavouriteList(ui.item.value)
            } else {
                searchChampion(ui.item.value);
            }

            document.getElementById("tags").value = "";
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
    $("#tags").focus();
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
                saveData("patch", patch);
                resolve(patch);
            }
        };
        xhr.open("GET", "https://ddragon.leagueoflegends.com/realms/na.json", false);
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

// function updateChampionData(patchId) {
//     var xhr = new XMLHttpRequest();
//     xhr.onreadystatechange = function() {
//         if (this.readyState == 4 && this.status == 200) {
//             var data = JSON.parse(xhr.responseText);
//             var champions = [];

//             for (var c in data.data) {
//                 champions.push({ name: data.data[c].name, icon: data.data[c].image.full });
//             }
//             saveData("champions", champions);

//             console.log(getData("champions"));
//         }
//     };
//     xhr.open("GET", "http://ddragon.leagueoflegends.com/cdn/" + patchId + "/data/en_US/champion.json", true);
//     xhr.send();
// }

// function updatePatchData() {
//     var xhr = new XMLHttpRequest();
//     xhr.onreadystatechange = function() {
//         if (this.readyState == 4 && this.status == 200) {
//             var data = JSON.parse(xhr.responseText);
//             update(data.n.champion);
//             patch = { patchId: data.n.champion, updatedTime: Date() };
//             saveData("patch", patch);
//         }
//     };
//     xhr.open("GET", "https://ddragon.leagueoflegends.com/realms/na.json", false);
//     xhr.send();
// }

function addToFavouriteList(data) {
    var favouriteList = getData("favouriteList");

    if (favouriteList === false) {
        favouriteList = [];
    }

    var containInList = false;
    for (var favourite in favouriteList) {
        if (favouriteList[favourite] === data) {
            containInList = true;
        }
    }

    if (!containInList) {
        favouriteList.push(data);
    }

    saveData("favouriteList", favouriteList);

    updateFavLi(favouriteList);
}

function deleteFromFavouriteList(data) {
    var favouriteList = getData("favouriteList");

    if (favouriteList === false) {
        favouriteList = [];
    }

    for (var favourite in favouriteList) {
        if (favouriteList[favourite] == data) {
            favouriteList.splice(favourite, 1);
        }
    }

    saveData("favouriteList", favouriteList);

    updateFavLi(favouriteList);

    console.log(favouriteList);
}

function addFavouriteList() {
    sortable = Sortable.create(listWithHandle, {
        handle: '.my-handle',
        animation: 150,
        onUpdate: function( /**Event*/ evt, /**Event*/ originalEvent) {
            var data = list[evt.oldDraggableIndex];
            favouriteList.splice(evt.oldDraggableIndex, 1);
            favouriteList.splice(evt.newDraggableIndex, 0, data);

            //handle list here
            console.log(list);
        },
        items: list
    });

}

function updateListView(list) {
    var txt = "";
    var baseUrl = 'https://st3.depositphotos.com' +
        '/4111759/13425/v/1600/depositphotos_134255588-stock-il' +
        'lustration-empty-photo-of-';

    for (var i in list) {
        txt += '<li class="list-group-item"><div data-item=' + list[i].name + ' class="Row">' +
            '<img class="icon noselect" src=' + baseUrl + list[i].icon + '></img>' +
            '<label class="Column noselect vertical-center">' + list[i].name + '</label>' +
            '<div class="Column right"></div><span class="glyphicon' +
            ' glyphicon-remove edit" style="visibility:hidden; ' +
            'color:red; text-align:right; cursor:pointer;"></span>' +
            '<span class="noselect">&nbsp;&nbsp;</span><span ' +
            'class="glyphicon glyphicon-move my-handle' +
            ' edit" aria-hidden="true" style="visibility:hidden;">' +
            '</span></div></li>'
    }

    document.getElementById("listWithHandle").innerHTML = txt;

    isEditVisible = false;
}

// function updateFavLi(favouriteList) {
//     var txt = "";

//     for (var favourite in favouriteList) {
//         txt += "<div><label class='items left' data-champion='" + favouriteList[favourite] + "'>" + favouriteList[favourite] + "</label>";

//         txt += "<button class='deleteBtns right' data-champion='" + favouriteList[favourite] + "'>Delete</button>"

//         txt += "</div>";
//     }

//     document.getElementById("favLi").innerHTML = txt;

//     console.log(favouriteList);

//     var lbls = document.getElementsByClassName("items");
//     var deleteBtn = document.getElementsByClassName("deleteBtns");

//     var lblClicked = function() {
//         var attribute = this.getAttribute("data-champion");
//         searchChampion(attribute);
//     };

//     var deleteClicked = function() {
//         var attribute = this.getAttribute("data-champion");
//         deleteFromFavouriteList(attribute);
//     };

//     for (var i = 0; i < lbls.length; i++) {
//         lbls[i].addEventListener('click', lblClicked, false);
//         deleteBtn[i].addEventListener('click', deleteClicked, false);
//     }
// }

$(document).ready(function() {
    patch = getData("patch");
    console.log("Current patchId: " + patch.patchId);
    if (patch === false) {
        console.log("patch is false");
        updatePatchData().then(result => {
            console.log(result);
            updateChampionData(result.patchId).then(champions => {
                console.log(champions);
                addAutoComplete(champions);
            });
        });

    } else {
        addAutoComplete(getData("champions"));
    }

    updateFavLi(getData("favouriteList"));
});

function searchChampion(champion) {
    var newURL = "https://u.gg/lol/champions/" + champion + "/build";
    chrome.tabs.create({ url: newURL });
}