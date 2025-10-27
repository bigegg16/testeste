const EnemyType = 
{
    LivingHarvestable: 0,
    LivingSkinnable: 1,
    Enemy: 2,
    MediumEnemy: 3,
    EnchantedEnemy: 4,
    MiniBoss: 5,
    Boss: 6,
    Drone: 7,
    MistBoss: 8,
    Events: 9,
};

class Mob
{
    constructor(id, typeId, posX, posY, health, enchantmentLevel, rarity)
    {
        this.id = id;
        this.typeId = typeId;
        this.posX = posX;
        this.posY = posY;
        this.health = health;
        this.enchantmentLevel = enchantmentLevel;
        this.rarity = rarity;
        this.tier = 0;
        this.type = EnemyType.Enemy;
        this.name = null;
        this.exp = 0;
        this.hX = 0;
        this.hY = 0;
    }
}

// MIST PORTALS ??
class Mist
{
    constructor(id, posX, posY, name, enchant)
    {
        this.id = id;
        this.posX = posX;
        this.posY = posY;
        this.name = name;
        this.enchant = enchant;
        this.hX = 0;
        this.hY = 0;

        if (name.toLowerCase().includes("solo"))
        {
            this.type = 0;
        }
        else
        {
            this.type = 1;
        }
    }
}

class MobsHandler
{
    constructor(settings)
    {
        this.settings = settings;

        this.mobsList = [];
        this.mistList = [];
        this.mobinfo = {};

        this.harvestablesNotGood = [];

        this.lastLivingFilterHash = this.computeLivingFilterHash();

        const logEnemiesList = document.getElementById("logEnemiesList");
        if (logEnemiesList)
            logEnemiesList.addEventListener("click", () => this.logVisibleEntities());

        const logHiddenLiving = document.getElementById("logHiddenLiving");
        if (logHiddenLiving)
            logHiddenLiving.addEventListener("click", () => this.logFilteredLiving());
    }

    updateMobInfo(newData)
    {
        this.mobinfo = newData;
    }

    NewMobEvent(parameters)
    {
        console.debug(parameters);

        const id = parseInt(parameters[0]); // entity id
        let typeId = parseInt(parameters[1]); // real type id

        const loc = parameters[7];
        let posX = loc[0];
        let posY = loc[1];

        let exp = 0
        try
        {
            exp = parseFloat(parameters[13]);
        }
        catch (error)
        {
            exp = 0;
        }

        let name = null;
        try
        {
            name = parameters[32];
        }
        catch (error)
        {
            try
            {
                name = parameters[31];
            }
            catch (error2)
            {
                name = null;
            }
        }

        let enchant = 0;
        try
        {
            enchant = parseInt(parameters[33]);
        }
        catch (error)
        {
            enchant = 0;
        }

        if (Number.isNaN(enchant))
        {
            enchant = 0;
        }

        let rarity = 1;
        try
        {
            rarity = parseInt(parameters[19]);
        }
        catch (error)
        {
            rarity = 1;
        }

        // Photon packets omit parameter 19 for some critters (for example common rabbits).
        // In that case parseInt returns NaN, so fall back to the default rarity.
        if (Number.isNaN(rarity))
        {
            rarity = 1;
        }

        if (name != null)
        {
            this.AddMist(id, posX, posY, name, enchant);
        }
        else
        {
            this.AddEnemy(id, typeId, posX, posY, exp, enchant, rarity, parameters);
        }
    }
    

    AddEnemy(id, typeId, posX, posY, health, enchant, rarity, parameters)
    {
        if (this.mobsList.some(mob => mob.id === id))
            return;

        if (this.harvestablesNotGood.some(mob => mob.id === id))
            return;

        const h = new Mob(id, typeId, posX, posY, health, enchant, rarity);
        const prefabInfo = this.extractMobPrefabInfo(parameters);

        // TODO
        // List of enemies
 codex/review-radar-code-functionality-0hwu8q
        const hasKnownMobInfo = this.mobinfo[typeId] != null;
        const resolvedMetadata = this.resolveMobMetadata(typeId, prefabInfo);

        if (resolvedMetadata.type != null)
            h.type = resolvedMetadata.type;

        if (resolvedMetadata.name != null)
            h.name = resolvedMetadata.name;

        if (resolvedMetadata.tier != null)
            h.tier = resolvedMetadata.tier;

        if (hasKnownMobInfo && this.isLivingMobType(h.type) && typeId == 397 && h.tier == 5 && rarity <= 1)

        if (this.mobinfo[typeId] != null)
main
        {
            h.tier = 1;
        }

        const isLiving = this.isLivingMob(h);

 codex/review-radar-code-functionality-0hwu8q
        if (isLiving)
        {
            const fallbackEnchant = Math.max(0, h.rarity - 1);
            const normalizedFallback = this.normalizeEnchant(fallbackEnchant);

            if (h.type == EnemyType.LivingSkinnable || h.type == EnemyType.LivingHarvestable)
            {
                // Living resources don't always populate the enchantment slot in the packet.
                // When that happens the enchant level is encoded as rarity (1 => normal,
                // 2 => uncommon, ...), so recover it from there to keep the filters aligned
                // with what the player sees in game.
                const fallbackEnchant = Math.max(0, h.rarity - 1);
                const normalizedFallback = this.normalizeEnchant(fallbackEnchant);

                if (normalizedFallback > h.enchantmentLevel)
                {
                    h.enchantmentLevel = normalizedFallback;
                    enchant = normalizedFallback;
                }
            }

            enchant = h.enchantmentLevel;

            // Some living skinnable mobs reuse the same template id for different tiers.
            // Template 397 should represent the T5 treasure terrorbird, but the game also
            // spawns common rabbits with the very same type id. These rabbits are tier 1
            // creatures with rarity 1, so correct their tier before applying the filters.
            if (h.type == EnemyType.LivingSkinnable && typeId == 397 && h.tier == 5 && rarity <= 1)
            {
                h.tier = 1;
            }

            h.tier = this.normalizeTier(h.tier);
            h.enchantmentLevel = this.normalizeEnchant(h.enchantmentLevel);

            if (h.type == EnemyType.LivingSkinnable)
            {
                /*
                   If animal is enchanted, it'll probably never work and jump into this return
                   Because it's sending an event with normal animal with tier, ect
                   And after send another event to say, this animal is enchant Y
                   And it's the same with the other living harvestables
                   But keep that in case it changes
                */
                   //console.log(parameters);
                if (!this.shouldDisplayLivingMob(h))
                {
                    this.harvestablesNotGood.push(h);
                    return;
                }
            }
            else if (h.type == EnemyType.LivingHarvestable)
            {
                /*
                   Same as animals comment before
                */
                if (!this.shouldDisplayLivingMob(h))
                {
                    this.harvestablesNotGood.push(h);
                    return;
                }
            }
            // Should do the work and handle all the enemies
            else if (h.type >= EnemyType.Enemy && h.type <= EnemyType.Boss)
            {
                const offset = EnemyType.Enemy;
 main

            if (normalizedFallback > h.enchantmentLevel)
                h.enchantmentLevel = normalizedFallback;

codex/review-radar-code-functionality-0hwu8q
            if (prefabInfo.tier != null)
                h.tier = prefabInfo.tier;

            if (prefabInfo.resourceName != null)
                h.name = this.normalizeLivingResourceName(prefabInfo.resourceName, h.type);

            h.tier = this.normalizeTier(h.tier);
            h.enchantmentLevel = this.normalizeEnchant(h.enchantmentLevel);

            if (!this.shouldDisplayLivingMob(h))
            {
                this.harvestablesNotGood.push(h);
                return;
            }
        }
        else if (h.type >= EnemyType.Enemy && h.type <= EnemyType.Boss)
        {
            if (!hasKnownMobInfo && !this.settings.showUnmanagedEnemies)
                return;

            const offset = EnemyType.Enemy;

            if (!this.settings.enemyLevels[h.type - offset])
                return;

            if (this.settings.showMinimumHealthEnemies && health < this.getMinimumHealthThreshold())
                return;
        }
        else if (h.type == EnemyType.Drone)
        {
            if (!this.settings.avaloneDrones) return;
        }
        else if (h.type == EnemyType.MistBoss)
        {
            if (h.name == "CRYSTALSPIDER" && !this.settings.bossCrystalSpider) return;
            else if (h.name == "FAIRYDRAGON" && !this.settings.settingBossFairyDragon) return;
            else if (h.name == "VEILWEAVER" && !this.settings.bossVeilWeaver) return;
            else if (h.name == "GRIFFIN" && !this.settings.bossGriffin) return;
        }
        else if (h.type == EnemyType.Events)
        {
            if (!this.settings.showEventEnemies) return;
        }
        else if (!hasKnownMobInfo && !this.settings.showUnmanagedEnemies) return;
        else
        {
            if (this.settings.showMinimumHealthEnemies && health < this.getMinimumHealthThreshold())
                return;
        }

                if (this.settings.showMinimumHealthEnemies && health < this.getMinimumHealthThreshold())
                    return;
            }
            else if (h.type == EnemyType.Drone)
            {
                if (!this.settings.avaloneDrones) return;
            }
            else if (h.type == EnemyType.MistBoss)
            {
                if (h.name == "CRYSTALSPIDER" && !this.settings.bossCrystalSpider) return;
                else if (h.name == "FAIRYDRAGON" && !this.settings.settingBossFairyDragon) return;
                else if (h.name == "VEILWEAVER" && !this.settings.bossVeilWeaver) return;
                else if (h.name == "GRIFFIN" && !this.settings.bossGriffin) return;
            }
            // Events
            else if (h.type == EnemyType.Events)
            {
                if (!this.settings.showEventEnemies) return;
            }
            // Unmanaged type
            else if (!this.settings.showUnmanagedEnemies) return;
            else
            {
                if (this.settings.showMinimumHealthEnemies && health < this.getMinimumHealthThreshold())
                    return;
            }

        }
        // Unmanaged id
        else if (!this.settings.showUnmanagedEnemies) return;
        else if (this.settings.showMinimumHealthEnemies && health < this.getMinimumHealthThreshold())
            return;

        h.enchantmentLevel = this.normalizeEnchant(h.enchantmentLevel);
        h.tier = this.normalizeTier(h.tier);
 main

        if (!isLiving)
        {
            h.enchantmentLevel = this.normalizeEnchant(h.enchantmentLevel);
            h.tier = this.normalizeTier(h.tier);
        }

        this.mobsList.push(h);
    }

    removeMob(id)
    {
        const pSize = this.mobsList.length;

        this.mobsList = this.mobsList.filter((x) => x.id !== id);

        // That means we already removed the enemy, so it can't be in the other list
        if (this.mobsList.length < pSize) return;

        this.harvestablesNotGood = this.harvestablesNotGood.filter((x) => x.id !== id);
    }

    updateMobPosition(id, posX, posY)
    {
        var enemy = this.mobsList.find((enemy) => enemy.id === id);

        if (enemy)
        {
            enemy.posX = posX;
            enemy.posY = posY;

            return;
        }

        // We don't need to update mobs we don't show yet
        /*enemy = this.harvestablesNotGood.find((enemy) => enemy.id === id);

        if (!enemy) return;

        enemy.posX = posX;
        enemy.posY = posY;*/
    }

    updateEnchantEvent(parameters)
    {
        const mobId = parameters[0];
        const enchantmentLevel = parameters[1];

        // Check in this list for the harvestables & skinnables with the id
        var enemy = this.mobsList.find((mob) => mob.id == mobId);

        if (enemy)
        {
            enemy.enchantmentLevel = this.normalizeEnchant(enchantmentLevel);

            if (this.isLivingMob(enemy) && !this.shouldDisplayLivingMob(enemy))
            {
                if (!this.harvestablesNotGood.some((mob) => mob.id === enemy.id))
                    this.harvestablesNotGood.push(enemy);
                this.mobsList = this.mobsList.filter((mob) => mob.id !== enemy.id);
            }

            return;
        }

        // Else try in our not good list
        enemy = this.harvestablesNotGood.find((mob) => mob.id == mobId);

        if (!enemy) return;

        enemy.enchantmentLevel = this.normalizeEnchant(enchantmentLevel);

        if (!this.shouldDisplayLivingMob(enemy))
            return;

        this.mobsList.push(enemy);
        this.harvestablesNotGood = this.harvestablesNotGood.filter((x) => x.id !== enemy.id);
    }

    getMobList()
    {
        return [...this.mobsList];
    }


    AddMist(id, posX, posY, name, enchant)
    {
        if (this.mistList.some((mist) => mist.id === id))
            return;

        const d = new Mist(id, posX, posY, name, enchant);

        this.mistList.push(d);
    }

    removeMist(id)
    {
        this.mistList = this.mistList.filter((mist) => mist.id !== id);
    }

    updateMistPosition(id, posX, posY)
    {
        var mist = this.mistList.find((mist) => mist.id === id);

        if (!mist) return;

        mist.posX = posX;
        mist.posY = posY;
    }

    updateMistEnchantmentLevel(id, enchantmentLevel)
    {
        var mist = this.mistList.find((mist) => mist.id === id);

        if (!mist) return;

        mist.enchant = enchantmentLevel;
    }

    Clear()
    {
        this.mobsList = [];
        this.mistList = [];
        this.harvestablesNotGood = [];
        this.lastLivingFilterHash = this.computeLivingFilterHash();
    }

    logVisibleEntities()
    {
        console.groupCollapsed("[Radar] Visible mobs");

        if (this.mobsList.length === 0)
        {
            console.info("No mobs currently tracked.");
        }
        else
        {
            console.table(this.mobsList.map((mob) => this.describeMobForLog(mob)));
        }

        if (this.mistList.length > 0)
        {
            console.groupCollapsed("Mist portals");
            console.table(this.mistList.map((mist) => ({
                id: mist.id,
                name: mist.name,
                enchant: mist.enchant,
                type: mist.type === 0 ? "Solo" : "Duo",
                posX: mist.posX,
                posY: mist.posY,
            })));
            console.groupEnd();
        }

        console.groupEnd();
    }

    logFilteredLiving()
    {
        console.groupCollapsed("[Radar] Living resources filtered by settings");

        if (this.harvestablesNotGood.length === 0)
        {
            console.info("No living mobs are currently filtered out.");
        }
        else
        {
            console.table(this.harvestablesNotGood.map((mob) => this.describeMobForLog(mob)));
        }

        console.groupEnd();
    }

    describeMobForLog(mob)
    {
        return {
            id: mob.id,
            typeId: mob.typeId,
            name: mob.name,
            type: this.describeMobType(mob.type),
            tier: mob.tier,
            enchant: mob.enchantmentLevel,
            rarity: mob.rarity,
            health: mob.health,
            posX: mob.posX,
            posY: mob.posY,
        };
    }

    describeMobType(type)
    {
        switch (type)
        {
            case EnemyType.LivingHarvestable:
                return "Living Harvestable";
            case EnemyType.LivingSkinnable:
                return "Living Skinnable";
            case EnemyType.Enemy:
                return "Enemy";
            case EnemyType.MediumEnemy:
                return "Medium Enemy";
            case EnemyType.EnchantedEnemy:
                return "Enchanted Enemy";
            case EnemyType.MiniBoss:
                return "Mini Boss";
            case EnemyType.Boss:
                return "Boss";
            case EnemyType.Drone:
                return "Drone";
            case EnemyType.MistBoss:
                return "Mist Boss";
            case EnemyType.Events:
                return "Event";
            default:
                return "Unmanaged";
        }
    }

codex/review-radar-code-functionality-0hwu8q
    normalizeLivingResourceName(name, type)
    {
        if (type === EnemyType.LivingSkinnable)
            return "hide";

        const lowered = typeof name === "string" ? name.toLowerCase() : "";

        if (/(fiber|cotton|silk|flax|hemp|linen)/.test(lowered))
            return "fiber";

        if (/(wood|log|tree|timber)/.test(lowered))
            return "logs";

        if (/(ore|metal|ingot|bar|vein)/.test(lowered))
            return "ore";

        if (/(rock|stone|basalt|boulder|marble)/.test(lowered))
            return "rock";

        if (lowered === "hide")
            return "hide";

        return type === EnemyType.LivingHarvestable ? "fiber" : "hide";
    }

 main
    shouldDisplayLivingMob(mob)
    {
        const enchantLevel = this.normalizeEnchant(mob.enchantmentLevel);
        const tier = this.normalizeTier(mob.tier) - 1;

        const enchantKey = `e${enchantLevel}`;
        let matrix;

        if (mob.type == EnemyType.LivingSkinnable)
        {
            matrix = this.settings.harvestingLivingHide?.[enchantKey];
        }
        else
        {
            const resourceName = typeof mob.name === "string" ? mob.name.toLowerCase() : "";

            switch (resourceName)
            {
                case "fiber":
 codex/review-radar-code-functionality-0hwu8q
                case "cotton":
                case "silk":
                case "flax":
                case "hemp":
                case "linen":
 main
                    matrix = this.settings.harvestingLivingFiber?.[enchantKey];
                    break;
                case "hide":
                    matrix = this.settings.harvestingLivingHide?.[enchantKey];
                    break;
                case "logs":
                case "log":
 codex/review-radar-code-functionality-0hwu8q
                case "wood":
                case "tree":
                case "timber":
                    matrix = this.settings.harvestingLivingWood?.[enchantKey];
                    break;
                case "ore":
                case "metal":
                case "ingot":
                case "bar":
                    matrix = this.settings.harvestingLivingOre?.[enchantKey];
                    break;
                case "rock":
                case "stone":
                case "basalt":
                case "boulder":

                    matrix = this.settings.harvestingLivingWood?.[enchantKey];
                    break;
                case "ore":
                    matrix = this.settings.harvestingLivingOre?.[enchantKey];
                    break;
                case "rock":
 main
                    matrix = this.settings.harvestingLivingRock?.[enchantKey];
                    break;
                default:
                    matrix = undefined;
                    break;
            }
        }

        if (!Array.isArray(matrix))
            return false;

        return Boolean(matrix[tier]);
    }

    isLivingMob(mob)
    {
        return mob.type === EnemyType.LivingSkinnable || mob.type === EnemyType.LivingHarvestable;
    }

 codex/review-radar-code-functionality-0hwu8q
    isLivingMobType(type)
    {
        return type === EnemyType.LivingSkinnable || type === EnemyType.LivingHarvestable;
    }

 main
    normalizeEnchant(value)
    {
        const numeric = Number(value);

        if (!Number.isFinite(numeric))
            return 0;

        return Math.min(Math.max(Math.floor(numeric), 0), 4);
    }

    normalizeTier(value)
    {
        const numeric = Number(value);

        if (!Number.isFinite(numeric))
            return 1;

        return Math.min(Math.max(Math.floor(numeric), 1), 8);
    }

    getMinimumHealthThreshold()
    {
        const numeric = Number(this.settings.minimumHealthEnemies);

        if (!Number.isFinite(numeric))
            return 0;

        return numeric;
    }

    computeLivingFilterHash()
    {
        const matrices = [
            this.settings.harvestingLivingHide,
            this.settings.harvestingLivingFiber,
            this.settings.harvestingLivingWood,
            this.settings.harvestingLivingOre,
            this.settings.harvestingLivingRock,
        ];

        return matrices
            .map((matrix) => this.serializeMatrix(matrix))
            .join("|");
    }

    serializeMatrix(matrix)
    {
        if (!matrix || typeof matrix !== "object")
            return "";

        const keys = Object.keys(matrix).sort();

        return keys
            .map((key) => {
                const row = Array.isArray(matrix[key]) ? matrix[key] : [];
                return `${key}:${row.map((value) => (value ? 1 : 0)).join("")}`;
            })
            .join(",");
    }

    syncVisibilityWithSettings()
    {
        const livingFilterHash = this.computeLivingFilterHash();

        if (livingFilterHash === this.lastLivingFilterHash)
            return;

        this.lastLivingFilterHash = livingFilterHash;

        const livingMobs = new Map();

        for (const mob of this.mobsList)
        {
            if (this.isLivingMob(mob))
            {
                livingMobs.set(mob.id, mob);
            }
        }

        for (const mob of this.harvestablesNotGood)
        {
            livingMobs.set(mob.id, mob);
        }

        const nonLivingMobs = this.mobsList.filter((mob) => !this.isLivingMob(mob));
        const visibleLiving = [];
        const hiddenLiving = [];

        for (const mob of livingMobs.values())
        {
            mob.enchantmentLevel = this.normalizeEnchant(mob.enchantmentLevel);
            mob.tier = this.normalizeTier(mob.tier);

            if (this.shouldDisplayLivingMob(mob))
            {
                visibleLiving.push(mob);
            }
            else
            {
                hiddenLiving.push(mob);
            }
        }

        this.mobsList = nonLivingMobs.concat(visibleLiving);
        this.harvestablesNotGood = hiddenLiving;
 codex/review-radar-code-functionality-0hwu8q
    }

    extractMobPrefabInfo(parameters)
    {
        const info = {
            tier: null,
            resourceName: null,
            type: null,
        };

        const stack = [parameters];
        const visited = new Set();

        while (stack.length > 0)
        {
            const current = stack.pop();

            if (current === null || current === undefined)
                continue;

            if (typeof current === "string")
            {
                this.updatePrefabInfoFromString(current, info);
                continue;
            }

            if (typeof current !== "object")
                continue;

            if (visited.has(current))
                continue;

            visited.add(current);

            if (Array.isArray(current))
            {
                for (const value of current)
                    stack.push(value);
                continue;
            }

            if (typeof ArrayBuffer !== "undefined")
            {
                if (current instanceof ArrayBuffer)
                    continue;

                if (typeof ArrayBuffer.isView === "function" && ArrayBuffer.isView(current))
                    continue;
            }

            for (const key of Object.keys(current))
                stack.push(current[key]);
        }

        if (info.tier != null)
            info.tier = this.normalizeTier(info.tier);

        return info;
    }

    updatePrefabInfoFromString(text, info)
    {
        if (typeof text !== "string" || text.length === 0)
            return;

        if (info.tier == null)
        {
            const tierMatch = text.match(/T([1-8])_/i);

            if (tierMatch)
                info.tier = parseInt(tierMatch[1], 10);
        }

        const lowered = text.toLowerCase();

        if (info.resourceName == null)
        {
            if (/(hide|skin|pelt|fur|leather)/.test(lowered))
                info.resourceName = "hide";
            else if (/(fiber|cotton|silk|flax|hemp|linen)/.test(lowered))
                info.resourceName = "fiber";
            else if (/(wood|log|tree|timber)/.test(lowered))
                info.resourceName = "logs";
            else if (/(ore|metal|ingot|bar|vein)/.test(lowered))
                info.resourceName = "ore";
            else if (/(rock|stone|basalt|boulder|marble)/.test(lowered))
                info.resourceName = "rock";
        }

        if (info.type == null)
        {
            if (lowered.includes("mob_treasure"))
            {
                info.type = EnemyType.LivingSkinnable;

                if (info.resourceName == null)
                    info.resourceName = "hide";
            }
            else if (lowered.includes("critter_hide"))
            {
                info.type = EnemyType.LivingSkinnable;
            }
            else if (lowered.includes("critter_") || lowered.includes("livingresource"))
            {
                info.type = info.resourceName === "hide" ? EnemyType.LivingSkinnable : EnemyType.LivingHarvestable;
            }
        }

        if (info.type == null && info.resourceName != null)
            info.type = info.resourceName === "hide" ? EnemyType.LivingSkinnable : EnemyType.LivingHarvestable;
    }

    resolveMobMetadata(typeId, prefabInfo)
    {
        const info = this.mobinfo[typeId];
        const metadata = {
            tier: info ? info[0] : null,
            type: info ? info[1] : null,
            name: info ? info[2] : null,
        };

        if (prefabInfo.type != null)
        {
            if (metadata.type == null || (this.isLivingMobType(prefabInfo.type) && !this.isLivingMobType(metadata.type)))
                metadata.type = prefabInfo.type;
        }

        if (prefabInfo.resourceName != null)
        {
            if (metadata.type == null || this.isLivingMobType(metadata.type))
                metadata.name = prefabInfo.resourceName;
        }

        if (prefabInfo.tier != null)
        {
            if (metadata.type == null || this.isLivingMobType(metadata.type))
                metadata.tier = prefabInfo.tier;
        }

        if (this.isLivingMobType(metadata.type))
            metadata.name = this.normalizeLivingResourceName(metadata.name, metadata.type);

        if (metadata.type == null && metadata.name != null)
            metadata.type = metadata.name === "hide" ? EnemyType.LivingSkinnable : EnemyType.LivingHarvestable;

        return metadata;
 main
    }
}
