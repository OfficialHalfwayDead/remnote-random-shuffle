import {
  declareIndexPlugin,
  ReactRNPlugin,
  Rem,
  SelectionType,
} from "@remnote/plugin-sdk";

async function onActivate(plugin: ReactRNPlugin) {
  function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  const selectAndShuffle = async () => {
    const selection = await plugin.editor.getSelection();
    if (!selection) {
      return;
    }
    // get rem children of current item or selection of many rems
    let rems: Rem[] = [];
    if (selection.type === SelectionType.Text) {
      const focusedRem = await plugin.focus.getFocusedRem();
      if (!focusedRem) return;
      rems = await focusedRem.getChildrenRem();
    } else if (selection.type === SelectionType.Rem) {
      rems = (await plugin.rem.findMany(selection.remIds)) || [];
    }
    if (rems.length < 2) return;

    const parent = await rems[0].getParentRem();
    if (!parent) return;

    // build index array and shuffle
    const shuffleIndex = [];
    for (let i = 0; i < rems.length; i++) {
      if (rems[i].parent !== parent._id) return; // can't sort if they're not all of the same parent
      shuffleIndex[i] = i;
    }
    shuffleArray(shuffleIndex);

    // in case selection is 5-10th child, we don't want to place them in 1st position
    const positionOffset = (await rems[0].positionAmongstSiblings()) ?? 0;
    Promise.all(shuffleIndex.map(async (shuffledIndex, unshuffled) => {
      // console.log("shuffledIndex: %d, unshuffled: %d, text: %s", shuffledIndex, unshuffled, rems[shuffledIndex].text.toString());

      // pick an item based on the shuffled index out of the rems, then put it into the first slot
      // then do the same for the second slot. Since we start at index 0 and the slots are only dependent
      // on the slots with lower indices, there are no interaction problems where inserting an item moves
      // other already inserted items around
      plugin.rem.moveRems(
        [rems[shuffledIndex]],
        parent,
        positionOffset + unshuffled,
      );
    }));
  };

  await plugin.app.registerCommand({
    id: "shuffle-children",
    name: "Shuffle Children or Selection",
    quickCode: "sh",
    keywords: "random, sort",
    description:
      "Random sort children of the current Rem or a group of selected Rems.",
    // icon: `${plugin.rootURL}shuffle.svg`,
    action: selectAndShuffle,
  });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
