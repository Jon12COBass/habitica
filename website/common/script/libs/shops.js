import values from 'lodash/values';
import map from 'lodash/map';
import keys from 'lodash/keys';
import each from 'lodash/each';
import filter from 'lodash/filter';
import eachRight from 'lodash/eachRight';
import toArray from 'lodash/toArray';
import pickBy from 'lodash/pickBy';
import sortBy from 'lodash/sortBy';
import content from '../content/index';
import i18n from '../i18n';
import getItemInfo from './getItemInfo';
import updateStore from './updateStore';
import seasonalShopConfig from './shops-seasonal.config';

import getOfficialPinnedItems from './getOfficialPinnedItems';

let shops = {};

shops.getMarketCategories = function getMarket (user, language) {
  let officialPinnedItems = getOfficialPinnedItems(user);

  let categories = [];
  let eggsCategory = {
    identifier: 'eggs',
    text: i18n.t('eggs', language),
    notes: i18n.t('dropsExplanationEggs', language),
  };

  eggsCategory.items = sortBy(values(content.questEggs)
    .filter(egg => egg.canBuy(user))
    .concat(values(content.dropEggs))
    .map(egg => {
      return getItemInfo(user, 'eggs', egg, officialPinnedItems, language);
    }), 'key');
  categories.push(eggsCategory);

  let hatchingPotionsCategory = {
    identifier: 'hatchingPotions',
    text: i18n.t('hatchingPotions', language),
    notes: i18n.t('dropsExplanation', language),
  };
  hatchingPotionsCategory.items = sortBy(values(content.hatchingPotions)
    .filter(hp => !hp.limited)
    .map(hatchingPotion => {
      return getItemInfo(user, 'hatchingPotions', hatchingPotion, officialPinnedItems, language);
    }), 'key');
  categories.push(hatchingPotionsCategory);

  let premiumHatchingPotionsCategory = {
    identifier: 'premiumHatchingPotions',
    text: i18n.t('magicHatchingPotions', language),
    notes: i18n.t('premiumPotionNoDropExplanation', language),
  };
  premiumHatchingPotionsCategory.items = sortBy(values(content.hatchingPotions)
    .filter(hp => hp.limited && hp.canBuy())
    .map(premiumHatchingPotion => {
      return getItemInfo(user, 'premiumHatchingPotion', premiumHatchingPotion, officialPinnedItems, language);
    }), 'key');
  if (premiumHatchingPotionsCategory.items.length > 0) {
    categories.push(premiumHatchingPotionsCategory);
  }

  let foodCategory = {
    identifier: 'food',
    text: i18n.t('food', language),
    notes: i18n.t('dropsExplanation', language),
  };
  foodCategory.items = sortBy(values(content.food)
    .filter(food => food.canDrop || food.key === 'Saddle')
    .map(foodItem => {
      return getItemInfo(user, 'food', foodItem, officialPinnedItems, language);
    }), 'key');
  categories.push(foodCategory);

  return categories;
};

function getClassName (classType, language) {
  if (classType === 'wizard') {
    return i18n.t('mage', language);
  } else {
    return i18n.t(classType, language);
  }
}

shops.checkMarketGearLocked = function checkMarketGearLocked (user, items) {
  let result = filter(items, ['pinType', 'marketGear']);

  let availableGear = map(updateStore(user), (item) => getItemInfo(user, 'marketGear', item).path);

  for (let gear of result) {
    if (gear.klass !== user.stats.class) {
      gear.locked = true;
    }

    if (!gear.locked  && !availableGear.includes(gear.path)) {
      gear.locked = true;
    }
  }
};

shops.getMarketGearCategories = function getMarketGear (user, language) {
  let categories = [];
  let officialPinnedItems = getOfficialPinnedItems(user);

  for (let classType of content.classes) {
    let category = {
      identifier: classType,
      text: getClassName(classType, language),
    };

    let result = filter(content.gear.flat, ['klass', classType]);
    category.items = map(result, (e) => {
      let newItem = getItemInfo(user, 'marketGear', e, officialPinnedItems);

      return newItem;
    });

    shops.checkMarketGearLocked(user, category.items);

    categories.push(category);
  }

  return categories;
};


shops.getQuestShopCategories = function getQuestShopCategories (user, language) {
  let categories = [];
  let officialPinnedItems = getOfficialPinnedItems(user);

  /*
   * ---------------------------------------------------------------
   * Quest Bundles
   * ---------------------------------------------------------------
   *
   * These appear in the Content index.js as follows:
   * {
   *   bundleName: {
   *     key: 'bundleName',
   *     text: t('bundleNameText'),
   *     notes: t('bundleNameNotes'),
   *     group: 'group',
   *     bundleKeys: [
   *       'quest1',
   *       'quest2',
   *       'quest3',
   *     ],
   *     canBuy () {
   *       return true when bundle is available for purchase;
   *     },
   *   type: 'quests',
   *   value: 7,
   *   },
   *   secondBundleName: {
   *     ...
   *   },
   * }
   *
   * After filtering and mapping, the Shop will produce:
   *
   * [
   *   {
   *     identifier: 'bundle',
   *     text: 'i18ned string for bundles category',
   *     items: [
   *       {
   *         key: 'bundleName',
   *         text: 'i18ned string for bundle title',
   *         notes: 'i18ned string for bundle description',
   *         group: 'group',
   *         value: 7,
   *         currency: 'gems',
   *         class: 'quest_bundle_bundleName',
   *         purchaseType: 'bundles',
   *       },
   *       { second bundle },
   *     ],
   *   },
   *   { main quest category 1 },
   *   ...
   * ]
   *
   */

  let bundleCategory = {
    identifier: 'bundle',
    text: i18n.t('questBundles', language),
  };

  bundleCategory.items = sortBy(values(content.bundles)
    .filter(bundle => bundle.type === 'quests' && bundle.canBuy())
    .map(bundle => {
      return getItemInfo(user, 'bundles', bundle, officialPinnedItems, language);
    }));

  if (bundleCategory.items.length > 0) {
    categories.push(bundleCategory);
  }

  each(content.userCanOwnQuestCategories, type => {
    let category = {
      identifier: type,
      text: i18n.t(`${type}Quests`, language),
    };

    category.items = content.questsByLevel
      .filter(quest => quest.canBuy(user) && quest.category === type)
      .map(quest => {
        return getItemInfo(user, 'quests', quest, officialPinnedItems, language);
      });

    categories.push(category);
  });

  return categories;
};

shops.getTimeTravelersCategories = function getTimeTravelersCategories (user, language) {
  let categories = [];
  let stable = {pets: 'Pet-', mounts: 'Mount_Icon_'};
  for (let type in stable) {
    if (stable.hasOwnProperty(type)) {
      let category = {
        identifier: type,
        text: i18n.t(type, language),
        items: [],
      };

      for (let key in content.timeTravelStable[type]) {
        if (content.timeTravelStable[type].hasOwnProperty(key)) {
          if (!user.items[type][key]) {
            let item = {
              key,
              text: content.timeTravelStable[type][key](language),
              class: stable[type] + key,
              type,
              purchaseType: type,
              value: 1,
              notes: '',
              locked: false,
              currency: 'hourglasses',
              pinType: 'IGNORE',
            };
            category.items.push(item);
          }
        }
      }
      if (category.items.length > 0) {
        categories.push(category);
      }
    }
  }

  let sets = content.timeTravelerStore(user);
  for (let setKey in  sets) {
    if (sets.hasOwnProperty(setKey)) {
      let set = sets[setKey];
      let category = {
        identifier: set.key,
        text: set.text(language),
        path: `mystery.${set.key}`,
        pinType: 'mystery_set',
        purchaseAll: true,
      };

      category.items = map(set.items, item => {
        return {
          key: item.key,
          text: item.text(language),
          notes: item.notes(language),
          type: item.type,
          purchaseType: 'gear',
          value: 1,
          locked: false,
          currency: 'hourglasses',
          class: `shop_${item.key}`,
          pinKey: `timeTravelers!gear.flat.${item.key}`,
        };
      });
      if (category.items.length > 0) {
        categories.push(category);
      }
    }
  }

  return categories;
};

let flatGearArray = toArray(content.gear.flat);

shops.getSeasonalGear = function getSeasonalGear (user, set, officialPinnedItems, language, ignoreAlreadyOwned = false) {
  return flatGearArray.filter((gear) => {
    if (!ignoreAlreadyOwned && user.items.gear.owned[gear.key] !== undefined)
      return false;

    return gear.set === set;
  }).map(gear => {
    return getItemInfo(null, 'gear', gear, officialPinnedItems, language);
  });
};

shops.getSeasonalShop = function getSeasonalShop (user, language) {
  let officialPinnedItems = getOfficialPinnedItems(user);

  let resObject = {
    identifier: 'seasonalShop',
    text: i18n.t('seasonalShop'),
    notes: i18n.t(`seasonalShop${seasonalShopConfig.currentSeason}Text`),
    imageName: seasonalShopConfig.opened ? 'seasonalshop_open' : 'seasonalshop_closed',
    opened: seasonalShopConfig.opened,
    categories: this.getSeasonalShopCategories(user, language),
    featured: {
      text: i18n.t(seasonalShopConfig.featuredSet),
      items: shops.getSeasonalGear(user, seasonalShopConfig.featuredSet, officialPinnedItems, language, true),
    },
  };

  return resObject;
};

// To switch seasons/available inventory, edit the AVAILABLE_SETS object to whatever should be sold.
// let AVAILABLE_SETS = {
//   setKey: i18n.t('setTranslationString', language),
// };
shops.getSeasonalShopCategories = function getSeasonalShopCategories (user, language) {
  let officialPinnedItems = getOfficialPinnedItems(user);

  const AVAILABLE_SPELLS = [
    ...seasonalShopConfig.availableSpells,
  ];

  const AVAILABLE_QUESTS = [
    ...seasonalShopConfig.availableQuests,
  ];

  let categories = [];

  let spells = pickBy(content.spells.special, (spell, key) => {
    return AVAILABLE_SPELLS.indexOf(key) !== -1;
  });

  if (keys(spells).length > 0) {
    let category = {
      identifier: 'spells',
      text: i18n.t('seasonalItems', language),
    };

    category.items = map(spells, (spell) => {
      return getItemInfo(user, 'seasonalSpell', spell, officialPinnedItems, language);
    });

    categories.push(category);
  }

  let quests = pickBy(content.quests, (quest, key) => {
    return AVAILABLE_QUESTS.indexOf(key) !== -1;
  });

  if (keys(quests).length > 0) {
    let category = {
      identifier: 'quests',
      text: i18n.t('quests', language),
    };

    category.items = map(quests, (quest) => {
      return getItemInfo(user, 'seasonalQuest', quest, language);
    });

    categories.push(category);
  }

  for (let set of seasonalShopConfig.availableSets) {
    let category = {
      identifier: set,
      text: i18n.t(set),
    };

    category.items = shops.getSeasonalGear(user, set, officialPinnedItems, language, false);

    if (category.items.length > 0) {
      category.specialClass = category.items[0].specialClass;
      categories.push(category);
    }
  }

  return categories;
};

shops.getBackgroundShopSets = function getBackgroundShopSets (language) {
  let sets = [];
  let officialPinnedItems = getOfficialPinnedItems();

  eachRight(content.backgrounds, (group, key) => {
    let set = {
      identifier: key,
      text: i18n.t(key, language),
    };

    set.items = map(group, (background) => {
      return getItemInfo(null, 'background', background, officialPinnedItems, language);
    });

    sets.push(set);
  });

  return sets;
};

module.exports = shops;
