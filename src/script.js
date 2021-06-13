(async function () {
  // Using let instead of const so minify-es doesnt get too smart and move it away from the beginning
  /** @preserve NOTE: Do NOT release key with source
   */
  let ACCESS_TOKEN = "ENTER_ACCESS_TOKEN_HERE";

  /** @preserve Number of forks to query
   */
  let FORK_LOAD_COUNT = 50;

  /** @preserve Set to <2 for debug, <5 for Errors
   */
  let DEBUG_LEVEL = 3;

  /** @preserve Main function handle
   */

  async function handleTransitions() {
    // Authorization header
    let headerObj = new Headers();
    headerObj.append("Authorization", "token " + ACCESS_TOKEN);
    const auth = { headers: headerObj };

    // Show loading gif while sorting forks
    const loading = document.createElement("span");
    const statusText01 = "📊 Meaningful Forks is gathering data...";
    const statusText02 = "✨ Updating stars...";
    const statusText03 = "🍴 Sorting forks (might take a sec)...";
    const statusText04 = "🔀 Rearranging order...";
    loading.innerText = statusText01;
    loading.style.background = "#22f922";
    loading.style.borderRadius = "10px";
    loading.style.color = "black";
    loading.style.fontWeight = "bold";
    loading.style.padding = "10px";
    loading.style.width = "max-content";
    loading.style.height = "calc(20px + 1.5em)"; // pad + line height
    loading.style.bottom = "calc(10vh - 40px)";
    loading.style.left = "0";
    loading.style.right = "0";
    loading.style.zIndex = "9999";
    loading.style.position = "fixed";
    loading.style.margin = "0 auto";
    document.body.appendChild(loading);

    // Make sure footer is always visible even if our loading icon obscures it
    document.querySelector(".footer").style["margin-bottom"] = "5vh";

    const network = document.querySelector("#network");

    // like: musically-ut/lovely-forks
    // the first/top line should be the original repo (github no longer labels it specifically)
    const sourceRepoName = network
      .querySelectorAll(".repo")[0]
      .lastElementChild.getAttribute("href")
      .substring(1);
    if (DEBUG_LEVEL < 2) console.log("TCL: currentRepoUrl", sourceRepoName);
    const sourceAuthorName = sourceRepoName.substring(
      0,
      sourceRepoName.lastIndexOf("/")
    );
    // like: https://api.github.com/repos/GhettoSanta/lovely-forks/forks?sort=stargazers&per_page=${FORK_LOAD_COUNT}
    const forkApiUrl = `https://api.github.com/repos/${sourceRepoName}/forks?sort=stargazers&per_page=${FORK_LOAD_COUNT}`;
    if (DEBUG_LEVEL < 2) console.log("TCL: forkApiUrl", forkApiUrl);
    let main_forks = await fetch(forkApiUrl, auth)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to get the api url, exiting with status: ${response.status}`
          );
        } else {
          return response.json();
        }
      })
      .then((responseJson) => {
        return responseJson;
      })
      .catch((error) => {
        // this happens for unknown reasons on this particular repo, github either purposefully or accidentally doesn't allow it
        // Access to fetch at 'https://api.github.com/repos/github/gitignore/forks?sort=stargazers&per_page=${FORK_LOAD_COUNT}' from origin 'https://github.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
        // Sending mode: 'no-cors' along with auth header leads to all requests failing with response.status as 0
        if (DEBUG_LEVEL < 5) console.log(error);
        loading.innerText =
          "Problem accessing API. If you've entered your personal access token & this always happens here, this repo probably doesn't allow API access 😕";
        setTimeout(() => {
          loading.remove();
        }, 7500);
      });
    let sub_forks = [],
      useless_sub_forks = [];
    // if (DEBUG_LEVEL < 2) console.log("TCL: forks", forks.filter(fork => fork.owner.type === "Organization"));

    // subrepos (forks of forks) get out of order if not included in the ranking
    // aside from not displaying the amount of stars or commits which could be relevant
    // so now they are being included, but only one level deep to save time
    await Promise.all(
      main_forks.map(async (fork) => {
        if (fork.forks > 0) {
          if (DEBUG_LEVEL < 2)
            console.log(`${fork.full_name} has ${fork.forks} subforks`);
          let subfork_data = await fetch(
            fork.forks_url + `?sort=stargazers&per_page=${FORK_LOAD_COUNT}`,
            auth
          );
          let temp_sub_forks = await subfork_data.json();

          temp_sub_forks.forEach((sf) => {
            // make sure the subforks have actually done something
            if (sf.pushed_at !== fork.pushed_at) {
              sf.is_subfork = true;
              sf.forked_from = fork.full_name;
              sub_forks = sub_forks.concat(sf);
            } else {
              // TODO: remove these from the DOM or label them @ bottom
              // if (DEBUG_LEVEL < 2) console.log('irrelevant subfork', sf);
              useless_sub_forks.push(sf);
            }
          });
        }
      })
    );
    if (DEBUG_LEVEL < 2)
      console.log(`Found ${sub_forks.length} relevant subforks`, sub_forks);
    let forks = main_forks.concat(sub_forks);
    if (DEBUG_LEVEL < 2) console.log("TCL: forks.length: " + forks.length);
    const stargazerCheckPromises = [];
    let bad_forks = [];
    loading.innerText = statusText02;
    await Promise.all(
      forks.map(async (fork, index, forks) => {
        // like: mcanthony
        if (fork.owner === undefined) {
          if (DEBUG_LEVEL < 2)
            console.log("marking bad fork for delete", index, fork);
          bad_forks.push(index);
          return;
        }
        const authorName = fork["owner"]["login"];
        if (DEBUG_LEVEL < 2) console.log("TCL: authorName", authorName, index);
        if (authorName === "undefined") {
          return;
        } // skip
        const stargazersUrl = fork["stargazers_url"];
        stargazerCheckPromises.push(
          await fetch(stargazersUrl, auth)
            .then((data) => {
              if (data.ok) {
                return data.json();
              }
              throw new Error("Network response is not OK!");
            })
            .then((stargazers) => {
              // if (DEBUG_LEVEL < 2) console.log("TCL: stargazers", stargazers)
              stargazers.forEach((stargazer) => {
                if (
                  stargazer["login"] === authorName &&
                  forks[index]["stargazers_count"] > 0
                ) {
                  if (DEBUG_LEVEL < 2)
                    console.log(
                      `TCL: starCount of ${authorName} before: ${forks[index]["stargazers_count"]}`
                    );
                  // do not count the author's star
                  forks[index]["stargazers_count"]--;
                  if (DEBUG_LEVEL < 2)
                    console.log(
                      `TCL: starCount of ${authorName} after: ${forks[index]["stargazers_count"]}`
                    );
                }
              });
            })
            .catch(function (error) {
              if (DEBUG_LEVEL < 5)
                console.log(
                  "There has been a problem with your fetch operation: ",
                  error.message,
                  fork
                );
            })
        );
      })
    );
    if (DEBUG_LEVEL < 2)
      console.log(
        `found ${bad_forks.length} forks with bad data out of ${forks.length}`,
        bad_forks
      );
    if (bad_forks.length > 0) {
      bad_forks = remove_bad_forks(bad_forks);
    }

    await Promise.all(stargazerCheckPromises);
    forks.sort(sortBy("stargazers_count", true, parseInt));
    if (DEBUG_LEVEL < 2) console.log("End of modifying stargazer count!");
    loading.innerText = statusText03;
    // Get default branch of parent repo (where the current fork is forked from)
    // like: https://api.github.com/repos/GhettoSanta/lovely-forks
    // this only needs to be done once
    let sourceDefaultBranch = await getDefaultBranch(sourceRepoName);
    await asyncForEach(forks, async (fork, index, forks) => {
      try {
        const forkAuthorName = fork["owner"]["login"];
        const forkName = fork["full_name"]; // like: mcanthony/lovely-forks
        // Get default branch for current fork
        // let forkDefaultBranch = await getDefaultBranch(forkName);
        // we already have this info
        const forkDefaultBranch = fork.default_branch;
        const branchCompareUrl = `https://api.github.com/repos/${forkName}/compare/${sourceAuthorName}:${sourceDefaultBranch}...${forkAuthorName}:${forkDefaultBranch}`;

        await getFromApi(branchCompareUrl, ["ahead_by", "behind_by"]).then(
          (aheadBehindTuple) => {
            forks[index]["ahead_by"] = aheadBehindTuple[0];
            forks[index]["behind_by"] = aheadBehindTuple[1];
          }
        );
      } catch (error) {
        if (DEBUG_LEVEL < 5) console.log(error);
      }
      // mark subforks that are not ahead by any commits for delete
      // if (DEBUG_LEVEL < 2) console.log(fork, fork.is_subfork, fork.ahead_by);
      if (fork.is_subfork && fork["ahead_by"] === 0) {
        if (DEBUG_LEVEL < 2)
          console.log(
            "marking subfork ahead_by 0 for delete",
            index,
            fork.full_name
          );
        bad_forks.push(index);
        return;
      }
    });

    if (DEBUG_LEVEL < 2)
      console.log(
        `found ${bad_forks.length} subforks ahead_by 0 out of ${forks.length}`,
        bad_forks
      );
    if (bad_forks.length > 0) {
      bad_forks = remove_bad_forks(bad_forks);
    }
    // if (DEBUG_LEVEL < 2) console.log("TCL: forks", forks);
    // this part appears to happen so fast the status doesn't get updated..
    loading.innerText = statusText04;
    forks.sort(
      sortByMultipleFields(
        {
          name: "stargazers_count",
          primer: parseInt,
          highToLow: true,
        },
        {
          name: "ahead_by",
          primer: parseInt,
          highToLow: true,
        },
        {
          name: "behind_by",
          primer: parseInt,
          highToLow: false,
        }
      )
    );

    if (DEBUG_LEVEL < 2) console.log("Beginning of DOM operations!");
    forks.reverse().forEach((fork) => {
      if (DEBUG_LEVEL < 2) console.log("TCL: fork", fork);
      // if (fork.owner.login === 'undefined') { return; }
      const forkName = fork["full_name"]; // like: mcanthony/lovely-forks
      const starCount = fork["stargazers_count"];
      // if (DEBUG_LEVEL < 2) console.log(forkName, starCount);
      let hasRepo = false; // the repo is listed on the current page
      const repos = network.querySelectorAll("div.repo"),
        tree_svg = repos.length > 2 ? repos[1].querySelector("svg") : undefined;
      for (let i = 0; i < repos.length; i++) {
        // like: mcanthony/lovely-forks, remove the first "/" in url by substring(1) in repoName
        const href = repos[i].lastElementChild.getAttribute("href");
        if (href) {
          const repoName = href.substring(1);
          // if (DEBUG_LEVEL < 2) console.log(href, repoName, forkName, i);
          if (repoName === forkName) {
            hasRepo = true;
            if (fork.hasOwnProperty("is_subfork") && fork.is_subfork) {
              if (DEBUG_LEVEL < 2) console.log("adding dagger to subfork");
              // the normal L won't make sense because subforks are ranked at the same level now
              const dagger = document.createTextNode("\u2021"),
                svgs = repos[i].querySelectorAll("svg");
              if (tree_svg) svgs[0].replaceWith(tree_svg.cloneNode(true));
              svgs[1].replaceWith(dagger);
            }
            addStatus(repos[i]);
            break; // no need to keep searching after we found it
          }
        }
      }
      // if api returned a user whose repo is not displayed on the current page
      // max seems to be 1000 displayed repos
      if (!hasRepo) {
        if (DEBUG_LEVEL < 2) console.log(`${forkName} repo wasn't showing`);
        // create repo display
        //<div class="repo">
        //  <img alt="" class="network-tree" src="https://github.githubassets.com/images/modules/network/t.png">
        //  <a class="d-inline-block" data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev"><img class="gravatar" src="https://avatars1.githubusercontent.com/u/388995?s=32&amp;v=4" width="16" height="16" alt="@19dev"></a>
        //  <a data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev">19dev</a>
        //     /
        //  <a href="/19dev/flatdoc">flatdoc</a>
        //</div>
        const repo = document.createElement("div");
        // Don't treat these as new nodes in ajax checker
        repo.dataset.found = "alreadyFound";
        repo.classList.add("repo");

        // like: <a data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev">19dev</a>
        const ownerType = fork["owner"]["type"].toLowerCase();
        const nameAnchor = document.createElement("a");
        nameAnchor.setAttribute("data-hovercard-type", ownerType);
        const ownerName = fork["owner"]["login"];
        if (ownerType === "user") {
          const userId = fork["owner"]["id"];
          nameAnchor.setAttribute(
            "data-hovercard-url",
            `/hovercards?user_id=${userId}`
          );
        } else if (ownerType === "organization") {
          nameAnchor.setAttribute(
            "data-hovercard-url",
            `/orgs/${ownerName}/hovercard`
          );
          nameAnchor.setAttribute("href", `/${ownerName}`);
        }
        nameAnchor.setAttribute("href", `/${ownerName}`);
        nameAnchor.setAttribute("data-octo-click", "hovercard-link-click");
        nameAnchor.setAttribute("data-octo-dimensions", "link_type:self");

        // like: <a class="d-inline-block" data-hovercard-type="organization" data-hovercard-url="/orgs/19dev/hovercard" href="/19dev"><img class="gravatar" src="https://avatars1.githubusercontent.com/u/388995?s=32&amp;v=4" width="16" height="16" alt="@19dev"></a>
        const gravatarAnchor = nameAnchor.cloneNode(true);
        gravatarAnchor.style.paddingLeft = "4px";
        gravatarAnchor.style.paddingRight = "4px";
        // add owner name to nameAnchor after being cloned to gravatarAnchor
        nameAnchor.innerText = ownerName;
        gravatarAnchor.classList.add("d-inline-block");
        // <img class="gravatar" src="https://avatars1.githubusercontent.com/u/388995?s=32&amp;v=4" width="16" height="16" alt="@19dev">
        const gravatar = document.createElement("img");
        gravatar.classList.add("gravatar");
        const gravatarUrl = fork["owner"]["avatar_url"];
        gravatar.src = gravatarUrl;
        gravatar.width = "16";
        gravatar.height = "16";
        gravatar.alt = `@${ownerName}`;
        gravatarAnchor.appendChild(gravatar);

        // like: <a href="/19dev/flatdoc">flatdoc</a>
        const repoAnchor = document.createElement("a");
        repoAnchor.style.paddingRight = "4px";
        repoAnchor.setAttribute("href", `/${forkName}`);
        repoAnchor.innerText = fork["name"];

        // Putting parts all together
        repo.appendChild(tree_svg.cloneNode(true));
        repo.appendChild(gravatarAnchor);
        repo.appendChild(nameAnchor);
        repo.appendChild(document.createTextNode(" / "));
        repo.appendChild(repoAnchor);

        addStatus(repo);
      }

      function addStatus(repo) {
        if (DEBUG_LEVEL < 2) console.log("adding status", repo);
        const repoDocumentFragment = document.createDocumentFragment();
        repoDocumentFragment.appendChild(createIconSVG("star"));
        repoDocumentFragment.appendChild(
          document.createTextNode(starCount + " ")
        );
        if (fork["ahead_by"] !== undefined && fork["behind_by"] !== undefined) {
          if (fork["ahead_by"] > 0) {
            const upIcon = createIconSVG("up");
            repoDocumentFragment.appendChild(upIcon);
            repoDocumentFragment.appendChild(
              document.createTextNode(fork["ahead_by"] + " ")
            );
          }
          if (fork["ahead_by"] - fork["behind_by"] > 0) {
            repoDocumentFragment.appendChild(createIconSVG("flame"));
          }
        }
        if (fork.is_subfork) {
          const subforkTextNode = document.createElement("span");
          subforkTextNode.appendChild(
            document.createTextNode(` (subfork of ${fork.forked_from})`)
          );
          subforkTextNode.style["margin-left"] = "8px";
          repoDocumentFragment.appendChild(subforkTextNode);
        }
        repo.appendChild(repoDocumentFragment);
        network.firstElementChild.insertAdjacentElement("afterend", repo);
      }
      if (fork.hasOwnProperty("stargazers_count")) {
        if (DEBUG_LEVEL < 2)
          console.log("TCL: starCount", fork["stargazers_count"]);
      }
    });

    // Finished sorting
    // remove loading gif
    if (DEBUG_LEVEL < 2) console.log("finished sorting");
    loading.remove();

    async function getFromApi(url, properties) {
      let json = await fetch(url, auth).then((data) => data.json());
      // if (data.ok) {
      //   json = await data.json();
      // } else {
      //   throw new Error("Network response is not OK!");
      // }
      if (typeof properties === "string") {
        return processPropertyChain(json, properties);
      } else if (Array.isArray(properties)) {
        return properties.map((property) => {
          return processPropertyChain(json, property);
        });
      }

      function processPropertyChain(json, property) {
        if (property.indexOf(".") >= 0) {
          let result = json;
          const propertyChain = property.split(".");
          propertyChain.forEach((property) => {
            result = result[property];
          });
          return result;
        } else {
          return json[property];
        }
      }
    }

    async function getDefaultBranch(repoName) {
      const defaultBranchUrl = `https://api.github.com/repos/${repoName}`;
      return getFromApi(defaultBranchUrl, "default_branch");
    }

    // Source: https://stackoverflow.com/a/979325/6798201
    function sortBy(field, highToLow, primer) {
      var key = primer
        ? function (x) {
            return primer(x[field]);
          }
        : function (x) {
            return x[field];
          };

      highToLow = !highToLow ? 1 : -1;

      return function (a, b) {
        return (a = key(a)), (b = key(b)), highToLow * ((a > b) - (b > a));
      };
    }

    // Source: https://stackoverflow.com/a/6913821/6798201
    function sortByMultipleFields() {
      var fields = [].slice.call(arguments),
        n_fields = fields.length;

      return function (A, B) {
        var a, b, field, key, highToLow, result, i;

        for (i = 0; i < n_fields; i++) {
          result = 0;
          field = fields[i];

          key = typeof field === "string" ? field : field.name;

          a = A[key];
          b = B[key];

          if (typeof field.primer !== "undefined") {
            a = field.primer(a);
            b = field.primer(b);
          }

          highToLow = field.highToLow ? -1 : 1;

          if (a < b) result = highToLow * -1;
          if (a > b) result = highToLow * 1;
          if (result !== 0) break;
        }
        return result;
      };
    }

    // Based on: https://github.com/musically-ut/lovely-forks/blob/master/userscript/lovely-forks.user.js
    function createIconSVG(type) {
      const svgNS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("height", 12);
      svg.setAttribute("width", 10.5);
      svg.setAttribute("viewBox", "0 0 14 16");
      svg.style["vertical-align"] = "middle";
      svg.style["fill"] = "currentColor";
      svg.style["position"] = "relative";
      svg.style["bottom"] = "1px";
      svg.style["margin-left"] = "8px";

      svg.classList.add("opticon", "opticon-" + type);

      var title = document.createElementNS(svgNS, "title");

      var iconPath = document.createElementNS(svgNS, "path");
      switch (type) {
        case "star":
          title.appendChild(
            document.createTextNode(
              "Number of real stars (excluding author's star)"
            )
          );
          iconPath.setAttribute(
            "d",
            "M14 6l-4.9-0.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14l4.33-2.33 4.33 2.33L10.4 9.26 14 6z"
          );
          break;
        case "up":
          title.appendChild(document.createTextNode("Number of commits ahead"));
          iconPath.setAttribute("d", "M5 3L0 9h3v4h4V9h3L5 3z");
          iconPath.setAttribute("fill", "#84ed47");
          svg.setAttribute("viewBox", "0 0 10 16");
          svg.setAttribute("height", 16);
          break;
        case "flame":
          title.appendChild(
            document.createTextNode("Fork may be more recent than upstream.")
          );
          iconPath.setAttribute(
            "d",
            "M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86 1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02 1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z"
          );
          iconPath.setAttribute("fill", "#d26911");
          break;
      }

      iconPath.appendChild(title);
      svg.appendChild(iconPath);

      return svg;
    }

    // Based on: https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
    async function asyncForEach(array, callback) {
      const promises = [];
      for (let index = 0; index < array.length; index++) {
        promises.push(callback(array[index], index, array));
      }
      return Promise.all(promises);
    }

    function remove_bad_forks(indexes) {
      for (let i = 0; i < indexes.length; i++) {
        if (DEBUG_LEVEL < 2) console.log("deleting:", forks[indexes[i]]);
        delete forks[indexes[i]];
      }
      forks = forks.filter((el) => {
        return el !== undefined;
      });
      if (DEBUG_LEVEL < 2) console.log(`${forks.length} remaining forks`);
      return [];
    }
  }

  // Taken from https://gist.github.com/mjblay/18d34d861e981b7785e407c3b443b99b
  /* A utility function, for UserScripts, that detects 
    and handles AJAXed content. 

    This is relevant to us because when navigating within a repository on github.com,
    the no traditional reloads occur. Github.com instead uses ajax to handle links. This
    means our script will never load unless the user manually reloads the page.
    
    For a typical user, the natural navigation flow is to click on the "Insights" tab 
    and then click on "Forks". This flow does not activate the userscript until 
    the user then reloads the page. With this polling function, the page is loaded 
    automatically without reload.

    selectorText:
      The selector string that
      specifies the desired element(s).
    actionFunction:
      The code to run when elements are
      found. It is passed a jNode to the matched
      element.
*/
  async function waitForKeyElements(selectorTxt, actionFunction) {
    let targetNodes = document.querySelectorAll(selectorTxt);

    if (targetNodes && targetNodes.length > 0) {
      /*--- Found target node(s).  Go through each and act if they
            are new.
        */
      let runAction = false;
      targetNodes.forEach(function (element) {
        if (element.dataset.found != "alreadyFound") {
          element.dataset.found = "alreadyFound";
          runAction = true;
        }
      });
      if (runAction) {
        actionFunction().finally(() => {
          setTimeout(() => {
            waitForKeyElements(selectorTxt, actionFunction);
          }, 1000);
        });
        return;
      }
    }
    setTimeout(() => {
      waitForKeyElements(selectorTxt, actionFunction);
    }, 1000);
  }
  await waitForKeyElements("#network>.repo", handleTransitions);
})();
