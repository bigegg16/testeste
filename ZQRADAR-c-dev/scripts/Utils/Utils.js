
import { PlayersDrawing } from '../Drawings/PlayersDrawing.js';
import { HarvestablesDrawing } from '../Drawings/HarvestablesDrawing.js';
import { MobsDrawing } from '../Drawings/MobsDrawing.js';
import { ChestsDrawing } from '../Drawings/ChestsDrawing.js';
import { DungeonsDrawing } from '../Drawings/DungeonsDrawing.js';
import { MapDrawing } from '../Drawings/MapsDrawing.js';
import { WispCageDrawing } from '../Drawings/WispCageDrawing.js';
import { FishingDrawing } from '../Drawings/FishingDrawing.js';

import { EventCodes } from './EventCodes.js';

import { PlayersHandler } from '../Handlers/PlayersHandler.js';
import { WispCageHandler } from '../Handlers/WispCageHandler.js';
import { FishingHandler } from '../Handlers/FishingHandler.js';

var canvasMap = document.getElementById("mapCanvas");
var contextMap = canvasMap.getContext("2d");

var canvasGrid = document.getElementById("gridCanvas");
var contextGrid = canvasGrid.getContext("2d");

var canvas = document.getElementById("drawCanvas");
var context = canvas.getContext("2d");

var canvasFlash = document.getElementById("flashCanvas");
var contextFlash = canvas.getContext("2d");

var canvasOurPlayer = document.getElementById("ourPlayerCanvas");
var contextOurPlayer = canvasOurPlayer .getContext("2d");


var canvasItems = document.getElementById("thirdCanvas");
var contextItems = canvasItems.getContext("2d");

import { Settings } from './Settings.js';
const settings = new Settings();


const PACKET_HISTORY_LIMIT = 250;
const packetHistory = [];
const ENTITY_DEBUG_STORAGE_KEY = "radarEntityDebugSnapshot";
const ENTITY_DEBUG_SYNC_DELAY = 200;
const ENTITY_DEBUG_POLL_INTERVAL = 5000;
const eventCodeLookup = Object.entries(EventCodes).reduce((accumulator, entry) =>
{
    const key = entry[0];
    const value = entry[1];

    accumulator[value] = key;

    return accumulator;
}, {});

let entityDebugSnapshotDirty = false;
let entityDebugSnapshotTimer = null;

function recordPacketEntry(channel, dictionary)
{
    const payload = dictionary && typeof dictionary === "object" ? (dictionary.parameters ?? dictionary) : undefined;
    const timestamp = Date.now();

    let eventCode = null;
    let entityId = null;

    if (channel === "event" && Array.isArray(payload))
    {
        eventCode = payload[252];
        entityId = payload[0];
    }

    packetHistory.push({
        timestamp: timestamp,
        channel: channel,
        eventCode: eventCode,
        eventName: eventCode != null ? (eventCodeLookup[eventCode] ?? null) : null,
        entityId: entityId,
        parameters: payload,
    });

    if (packetHistory.length > PACKET_HISTORY_LIMIT)
        packetHistory.shift();
}

function logPacketHistory()
{
    console.groupCollapsed(`[Radar] Last ${packetHistory.length} packets`);

    if (packetHistory.length === 0)
    {
        console.info("No packets captured yet.");
        console.groupEnd();

        return;
    }

    const summary = packetHistory.map((entry, index) =>
    {
        return {
            index: index + 1,
            time: new Date(entry.timestamp).toLocaleTimeString(),
            channel: entry.channel,
            eventCode: entry.eventCode ?? "",
            eventName: entry.eventName ?? "",
            entityId: entry.entityId ?? "",
        };
    });

    console.table(summary);

    for (const entry of packetHistory)
    {
        const labelParts = [];

        labelParts.push(`[${new Date(entry.timestamp).toLocaleTimeString()}]`);
        labelParts.push(entry.channel);

        if (entry.eventName)
            labelParts.push(entry.eventName);
        else if (entry.eventCode != null)
            labelParts.push(`Code ${entry.eventCode}`);

        if (entry.entityId != null)
            labelParts.push(`ID ${entry.entityId}`);

        console.groupCollapsed(labelParts.join(" · "));
        console.log(entry.parameters);
        console.groupEnd();
    }

    console.groupEnd();
}

if (typeof window !== "undefined")
{
    window.radarDebug = window.radarDebug || {};
    window.radarDebug.logPacketHistory = logPacketHistory;
    window.radarDebug.getPacketHistory = () => [...packetHistory];
}



const harvestablesDrawing = new HarvestablesDrawing(settings);
const dungeonsHandler = new DungeonsHandler(settings);

var itemsInfo = new ItemsInfo();
var mobsInfo = new MobsInfo();

itemsInfo.initItems();
mobsInfo.initMobs();

var map = new MapH(-1);
const mapsDrawing = new MapDrawing(settings);

const chestsHandler = new ChestsHandler();
const mobsHandler = new MobsHandler(settings);
mobsHandler.updateMobInfo(mobsInfo.moblist);


const harvestablesHandler = new HarvestablesHandler(settings);
const playersHandler = new PlayersHandler(settings);

const wispCageHandler = new WispCageHandler(settings);
const wispCageDrawing = new WispCageDrawing(settings);

const fishingHandler = new FishingHandler(settings);
const fishingDrawing = new FishingDrawing(settings);

const chestsDrawing = new ChestsDrawing(settings);
const mobsDrawing = new MobsDrawing(settings);
const playersDrawing = new PlayersDrawing(settings);
const dungeonsDrawing = new DungeonsDrawing(settings);
playersDrawing.updateItemsInfo(itemsInfo.iteminfo);


function buildEntityDebugSnapshot()
{
    return {
        timestamp: Date.now(),
        mobs: mobsHandler.getMobDebugSnapshot(),
        harvestables: {
            staticResources: harvestablesHandler.getHarvestableDebugSnapshot(),
        },
    };
}

function persistEntityDebugSnapshot(snapshot)
{
    if (typeof window === "undefined")
        return;

    window.radarDebug = window.radarDebug || {};
    window.radarDebug.latestEntitySnapshot = snapshot;

    try
    {
        window.localStorage.setItem(ENTITY_DEBUG_STORAGE_KEY, JSON.stringify(snapshot));
    }
    catch (error)
    {
        console.warn("[Radar] Failed to persist entity debug snapshot.", error);
    }
}

function logEntitySnapshotToConsole(snapshot)
{
    if (!snapshot || typeof snapshot !== "object")
    {
        console.warn("[Radar] Entity debug snapshot is empty.");
        return;
    }

    const timestampLabel = snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleString() : "unknown";
    console.groupCollapsed(`[Radar] Entity snapshot · ${timestampLabel}`);

    const mobsSnapshot = snapshot.mobs || {};
    const visibleMobs = Array.isArray(mobsSnapshot.visible) ? mobsSnapshot.visible : [];
    const filteredLiving = Array.isArray(mobsSnapshot.filteredLiving) ? mobsSnapshot.filteredLiving : [];
    const mist = Array.isArray(mobsSnapshot.mist) ? mobsSnapshot.mist : [];

    if (visibleMobs.length === 0 && filteredLiving.length === 0 && mist.length === 0)
    {
        console.info("No mobs recorded in the latest snapshot.");
    }
    else
    {
        if (visibleMobs.length > 0)
        {
            console.groupCollapsed(`Visible mobs (${visibleMobs.length})`);
            console.table(visibleMobs);
            console.groupEnd();
        }

        if (filteredLiving.length > 0)
        {
            console.groupCollapsed(`Filtered living mobs (${filteredLiving.length})`);
            console.table(filteredLiving);
            console.groupEnd();
        }

        if (mist.length > 0)
        {
            console.groupCollapsed(`Mist portals (${mist.length})`);
            console.table(mist);
            console.groupEnd();
        }
    }

    const harvestableSnapshot = snapshot.harvestables || {};
    const staticResources = Array.isArray(harvestableSnapshot.staticResources) ? harvestableSnapshot.staticResources : [];

    if (staticResources.length > 0)
    {
        console.groupCollapsed(`Static resources (${staticResources.length})`);
        console.table(staticResources);
        console.groupEnd();
    }
    else
    {
        console.info("No static resources recorded in the latest snapshot.");
    }

    console.groupEnd();
}

function syncEntityDebugSnapshotNow()
{
    const snapshot = buildEntityDebugSnapshot();
    persistEntityDebugSnapshot(snapshot);
    entityDebugSnapshotDirty = false;

    return snapshot;
}

function markEntitySnapshotDirty()
{
    entityDebugSnapshotDirty = true;

    if (typeof window === "undefined")
        return;

    if (entityDebugSnapshotTimer != null)
        return;

    entityDebugSnapshotTimer = window.setTimeout(() =>
    {
        entityDebugSnapshotTimer = null;

        if (!entityDebugSnapshotDirty)
            return;

        entityDebugSnapshotDirty = false;
        syncEntityDebugSnapshotNow();
    }, ENTITY_DEBUG_SYNC_DELAY);
}

if (typeof window !== "undefined")
{
    window.radarDebug = window.radarDebug || {};
    Object.assign(window.radarDebug, {
        getEntityDebugSnapshot: () => buildEntityDebugSnapshot(),
        syncEntityDebugSnapshot: () => syncEntityDebugSnapshotNow(),
        logEntitySnapshot: () =>
        {
            const snapshot = syncEntityDebugSnapshotNow();
            logEntitySnapshotToConsole(snapshot);
            return snapshot;
        },
    });

    syncEntityDebugSnapshotNow();
    window.setInterval(() => syncEntityDebugSnapshotNow(), ENTITY_DEBUG_POLL_INTERVAL);
}


let lpX = 0.0;
let lpY = 0.0;

var flashTime = -1;

const drawingUtils = new DrawingUtils();
drawingUtils.initCanvas(canvas, context);
drawingUtils.initGridCanvas(canvasGrid, contextGrid);
drawingUtils.InitOurPlayerCanvas(canvasOurPlayer, contextOurPlayer);


const socket = new WebSocket('ws://localhost:5002');

const logPacketHistoryButton = document.getElementById("logPacketHistory");

if (logPacketHistoryButton)
    logPacketHistoryButton.addEventListener("click", () => logPacketHistory());

socket.addEventListener('open', (event) => {
  console.log('Connected to the WebSocket server.');

});

socket.addEventListener('message', (event) => {
  var data = JSON.parse(event.data);

  // Extract the string and dictionary from the object
  var extractedString = data.code;

  var extractedDictionary = JSON.parse(data.dictionary);

  recordPacketEntry(extractedString, extractedDictionary);

  switch (extractedString)
  {
    case "request":
        onRequest(extractedDictionary["parameters"]);
        break;

    case "event":
        onEvent(extractedDictionary["parameters"]);
        break;

    case "response":
        onResponse(extractedDictionary["parameters"]);
        break;
  }

  markEntitySnapshotDirty();
});


function onEvent(Parameters)
{
    const id = parseInt(Parameters[0]);
    const eventCode = Parameters[252];

    switch (eventCode)
    {
        // DEBUG

        /*case 506:
            console.log("MistsPlayerJoinedInfo");
            console.log(Parameters);
            break;

        case 474:
            console.log("CarriedObjectUpdate");
            console.log(Parameters);
            break;

        case 530:
            console.log("TemporaryFlaggingStatusUpdate ");
            console.log(Parameters);
            break;*/

        // END DEBUG

        case EventCodes.Leave:
            playersHandler.removePlayer(id);
            mobsHandler.removeMist(id);
            mobsHandler.removeMob(id);
            dungeonsHandler.RemoveDungeon(id);
            chestsHandler.removeChest(id);
            fishingHandler.RemoveFish(id);
            wispCageHandler.RemoveCage(id);
            break;

        case EventCodes.Move:
            const posX = Parameters[4];
            const posY = Parameters[5];

            //playersHandler.updatePlayerPosition(id, posX, posY, Parameters);
            mobsHandler.updateMistPosition(id, posX, posY);
            mobsHandler.updateMobPosition(id, posX, posY);
            break;

        case EventCodes.NewCharacter:
            const ttt = playersHandler.handleNewPlayerEvent(Parameters, map.isBZ);
            flashTime = ttt < 0 ? flashTime : ttt;
            break;

        case EventCodes.NewSimpleHarvestableObjectList:
            harvestablesHandler.newSimpleHarvestableObject(Parameters);
            break;

        case EventCodes.NewHarvestableObject:
            harvestablesHandler.newHarvestableObject(id, Parameters);
            break;

        case EventCodes.HarvestableChangeState:
            harvestablesHandler.HarvestUpdateEvent(Parameters);
            break;

        case EventCodes.HarvestFinished:
            harvestablesHandler.harvestFinished(Parameters);
            break;

        case EventCodes.MobChangeState:
            mobsHandler.updateEnchantEvent(Parameters);
            break;

        case EventCodes.RegenerationHealthChanged:
            playersHandler.UpdatePlayerHealth(Parameters);
            break;

        case EventCodes.HealthUpdate:
            playersHandler.UpdatePlayerLooseHealth(Parameters);
            break;
        
        // TEST
        case EventCodes.MountHealthUpdate:
            console.log();
            console.log("MountHealthUpdate");
            console.log(Parameters);
            break;

        // TEST
        case EventCodes.CharacterStats:
            console.log();
            console.log("CharacterStats");
            console.log(Parameters);
            break;

        // TEST
        case EventCodes.RegenerationHealthEnergyComboChanged:
            console.log();
            console.log("RegenerationHealthEnergyComboChanged");
            console.log(Parameters);
            break;


        case EventCodes.CharacterEquipmentChanged:
            playersHandler.updateItems(id, Parameters);
            break;

        case EventCodes.NewMob:
            mobsHandler.NewMobEvent(Parameters);
            break;

        case EventCodes.Mounted:
            playersHandler.handleMountedPlayerEvent(id, Parameters);
            break;

        case EventCodes.NewRandomDungeonExit:
            dungeonsHandler.dungeonEvent(Parameters);
            break;

        case EventCodes.NewLootChest:
            chestsHandler.addChestEvent(Parameters);
            break;

        case EventCodes.NewMistsCagedWisp:
            wispCageHandler.NewCageEvent(Parameters);
            break;

        case EventCodes.MistsWispCageOpened:
            wispCageHandler.CageOpenedEvent(Parameters);
            break;

        // TODO
        case EventCodes.NewFishingZoneObject:
            fishingHandler.NewFishEvent(Parameters);
            break;

        // TODO
        case EventCodes.FishingFinished:
            fishingHandler.FishingEnd(Parameters);
            break;

        case 590:
            console.log()
            console.log("Key sync")
            console.log(Parameters)
            break;

        /*default:
            console.log("default");
            console.log(Parameters);*/
    }
};

function onRequest(Parameters)
{ 
    // Player moving
    if (Parameters[253] == 21)
    {
        lpX = Parameters[1][0];
        lpY = Parameters[1][1];
        console.log(lpX)
    }
}

function onResponse(Parameters)
{
    // Player change cluster
    if (Parameters[253] == 35)
    {
        map.id = Parameters[0];
        
        /*console.log()
        console.log("Cluster change")
        console.log(Parameters)*/
    }
    // All data on the player joining the map (us)
    else if (Parameters[253] == 2)
    {
        lpX = Parameters[9][0];
        lpY = Parameters[9][1];

        // TODO bz portals does not trigger this event, so when change map check if map id is portal in event 35 above ^
        // And clear everything too 
        map.isBZ = Parameters[103] == 2;

        /*console.log()
        console.log("Join")
        console.log(Parameters)*/

        ClearHandlers();
    }
    // GetCharacterStats  
    else if (Parameters[253] == 137)
    {
        console.log()
        console.log("GetCharacterStats")
        console.log(Parameters)
    }
};

requestAnimationFrame(gameLoop);

function render()
{

    context.clearRect(0, 0, canvas.width, canvas.height);
    contextMap.clearRect(0, 0, canvasMap.width, canvasMap.height);
    contextFlash.clearRect(0, 0, canvasFlash.width, canvasFlash.height);

    mapsDrawing.Draw(contextMap, map);

    harvestablesDrawing.invalidate(context, harvestablesHandler.harvestableList);

    mobsDrawing.invalidate(context, mobsHandler.mobsList, mobsHandler.mistList);
    chestsDrawing.invalidate(context, chestsHandler.chestsList);
    wispCageDrawing.Draw(context, wispCageHandler.cages);
    fishingDrawing.Draw(context, fishingHandler.fishes);
    dungeonsDrawing.Draw(context, dungeonsHandler.dungeonList);
    playersDrawing.invalidate(context, playersHandler.playersInRange);

    // Flash
    if (settings.settingFlash && flashTime >= 0)
    {
        contextFlash.rect(0, 0, 500, 500);
        contextFlash.rect(20, 20, 460, 460);

        contextFlash.fillStyle = 'red';
        contextFlash.fill('evenodd');
    }
}


var previousTime = performance.now();

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}



function update() {

    const currentTime = performance.now();
    const deltaTime = currentTime - previousTime;
    const t = Math.min(1, deltaTime / 100);



    if (settings.showMapBackground)
        mapsDrawing.interpolate(map, lpX, lpY, t);

    harvestablesHandler.removeNotInRange(lpX, lpY);
    harvestablesDrawing.interpolate(harvestablesHandler.harvestableList, lpX, lpY, t);


    mobsDrawing.interpolate(mobsHandler.mobsList, mobsHandler.mistList, lpX, lpY, t);


    chestsDrawing.interpolate(chestsHandler.chestsList, lpX, lpY, t);
    wispCageDrawing.Interpolate(wispCageHandler.cages, lpX, lpY, t);
    fishingDrawing.Interpolate(fishingHandler.fishes, lpX, lpY, t);
    dungeonsDrawing.interpolate(dungeonsHandler.dungeonList, lpX, lpY, t);
    playersDrawing.interpolate(playersHandler.playersInRange, lpX, lpY, t);

    // Flash
    if (flashTime >= 0)
    {
        flashTime -= t;
    }

    previousTime = currentTime;
}

function drawItems() {

    contextItems.clearRect(0, 0, canvasItems.width, canvasItems.height);

    if (settings.settingItems)
    {
        playersDrawing.drawItems(contextItems, canvasItems, playersHandler.playersInRange, settings.settingItemsDev);
    }

}
const intervalItems = 500;
setInterval(drawItems, intervalItems);

function checkLocalStorage()
{
    settings.update(settings);
    mobsHandler.syncVisibilityWithSettings();
    setDrawingViews();
    markEntitySnapshotDirty();
}

const interval = 300;
setInterval(checkLocalStorage, interval)



document.getElementById("button").addEventListener("click", function () {
    ClearHandlers();
});

function ClearHandlers()
{
    chestsHandler.chestsList = [];
    dungeonsHandler.dungeonList = [];
    fishingHandler.Clear();
    harvestablesHandler.Clear();
    mobsHandler.Clear();
    playersHandler.Clear();
    wispCageHandler.CLear();
    markEntitySnapshotDirty();
}

setDrawingViews();

function setDrawingViews() {
    const mainWindowMarginXValue = localStorage.getItem("mainWindowMarginX");
    const mainWindowMarginYValue = localStorage.getItem("mainWindowMarginY");
    const itemsWindowMarginXValue = localStorage.getItem("itemsWindowMarginX");
    const itemsWindowMarginYValue = localStorage.getItem("itemsWindowMarginY");
    const settingItemsBorderValue = localStorage.getItem("settingItemsBorder");
    const buttonMarginXValue = localStorage.getItem("buttonMarginX");
    const buttonMarginYValue = localStorage.getItem("buttonMarginY");

    const itemsWidthValue = localStorage.getItem("itemsWidth");
    const itemsHeightValue = localStorage.getItem("itemsHeight");

    // Check if the values exist in local storage and handle them
    if (mainWindowMarginXValue !== null) {
        document.getElementById('bottomCanvas').style.left = mainWindowMarginXValue + "px";
        document.getElementById('drawCanvas').style.left = mainWindowMarginYValue + "px";
    }

    if (mainWindowMarginYValue !== null) {
        document.getElementById('drawCanvas').style.top = mainWindowMarginYValue + "px";
        document.getElementById('bottomCanvas').style.top = mainWindowMarginYValue + "px";
    }

    if (itemsWindowMarginXValue !== null) {
        document.getElementById('thirdCanvas').style.left = itemsWindowMarginXValue + "px";
    }

    if (itemsWindowMarginYValue !== null) {
        document.getElementById('thirdCanvas').style.top = itemsWindowMarginYValue + "px";
    }

    if (itemsWidthValue !== null) {
        document.getElementById('thirdCanvas').style.width = itemsWidthValue + "px";
    }

    if (itemsHeightValue !== null) {
        document.getElementById('thirdCanvas').style.height = itemsHeightValue + "px";
    }

    if (settingItemsBorderValue !== null) {
        // Apply border based on the settingItemsBorderValue
        if (settingItemsBorderValue === "true") {

            document.getElementById('thirdCanvas').style.border = "2px solid grey";
        } else {

            document.getElementById('thirdCanvas').style.border = "none";
        }
    }

    if (buttonMarginXValue !== null) {
        document.getElementById('button').style.left = buttonMarginXValue + "px";
    }

    if (buttonMarginYValue !== null) {
        document.getElementById('button').style.top = buttonMarginYValue + "px";
    }



}