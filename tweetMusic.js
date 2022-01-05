// @ts-check
// NAME: TweetMusic
// AUTHOR: yukineko
// VERSION: 1.0
// DESCRIPTION: Share music on Twitter

/// <reference path="../globals.d.ts" />

(function TweetMusic() {
    const { CosmosAsync, URI } = Spicetify

    if (!(CosmosAsync && URI)) {
        setTimeout(TweetMusic, 300)
        return
    }

    function tweet(meta) {
        var parsedURI = meta.uri.split(':')
        var tweetText = encodeURIComponent(`${meta.title} - ${meta.description}\nhttps://open.spotify.com/${parsedURI[1]}/${parsedURI[2]}`)
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}&hashtags=Spotify`.replace('\n', '%0D%0A'))
    }

    var shareButton = document.createElement('div')
    shareButton.id = 'shareButton'
    shareButton.innerHTML = `
    <button class="control-button" aria-label="Share on Twitter" title="Share on Twitter" style="top:2px;">
        <svg role="img" height="16" width="16" viewBox="0 0 16 16" style="fill:currentcolor">
        <path d="M13.54 3.889q.984-.595 1.333-1.683-.905.54-1.929.738-.42-.452-.996-.706-.575-.254-1.218-.254-1.254 0-2.143.889-.889.889-.889 2.15 0 .318.08.691-1.857-.095-3.484-.932-1.627-.838-2.762-2.242-.413.714-.413 1.523 0 .778.361 1.445t.988 1.08q-.714-.009-1.373-.374v.04q0 1.087.69 1.92.691.834 1.739 1.048-.397.111-.794.111-.254 0-.571-.055.285.912 1.063 1.5.778.587 1.77.603-1.659 1.302-3.77 1.302-.365 0-.722-.048Q2.619 14 5.15 14q1.358 0 2.572-.361 1.215-.361 2.147-.988.933-.627 1.683-1.46.75-.834 1.234-1.798.484-.964.738-1.988t.254-2.032q0-.262-.008-.397.88-.635 1.508-1.563-.841.373-1.738.476z"/>
        </path>
        </svg>
    </button>`

    shareButton.addEventListener("click", function() {
        var current = Spicetify.Player.data.track
        tweet({
            uri: current.uri,
            title: current.metadata.title,
            description: current.metadata.artist_name
        })
    })

    function addController() {
        var controls = document.getElementsByClassName('ExtraControls')[0]

        if(!controls) {
            addController()
            return
        }

        controls.insertBefore(shareButton, controls.firstElementChild)
    }

    addController()

    async function shareMenu(uris, uid = [], context = undefined) {
        const uri = uris[0]
        const type = uri.split(":")[1]
        let meta;
        switch(type) {
            case Spicetify.URI.Type.TRACK:   meta = await fetchTrack(uri, uid, context); break;
            case Spicetify.URI.Type.ALBUM:   meta = await fetchAlbum(uri); break;
            case Spicetify.URI.Type.ARTIST:  meta = await fetchArtist(uri); break;
            case Spicetify.URI.Type.SHOW:    meta = await fetchShow(uri); break;
            case Spicetify.URI.Type.EPISODE: meta = await fetchEpisode(uri); break;
            case Spicetify.URI.Type.PLAYLIST:
            case Spicetify.URI.Type.PLAYLIST_V2:
                meta = await fetchPlaylist(uri); break;
        }

        tweet(meta)
    }

    // ContextMenu
    const fetchAlbum = async (uri) => {
        const base62 = uri.split(":")[2];
        const res = await CosmosAsync.get(`hm://album/v1/album-app/album/${base62}/desktop`);
        return ({
            uri,
            title: res.name,
            description: "Album",
            imageUrl: res.cover.uri,
        });
    };

    const fetchShow = async (uri) => {
        const base62 = uri.split(":")[2];
        const res = await CosmosAsync.get(
            `sp://core-show/unstable/show/${base62}?responseFormat=protobufJson`,
            { policy: { list: { index: true } } }
        );
        return ({
            uri,
            title: res.header.showMetadata.name,
            description: "Podcast",
            imageUrl: res.header.showMetadata.covers.standardLink,
        });
    };

    const fetchArtist = async (uri) => {
        const base62 = uri.split(":")[2];
        const res = await CosmosAsync.get(`hm://artist/v1/${base62}/desktop?format=json`);
        return ({
            uri,
            title: res.info.name,
            description: "Artist",
            imageUrl: res.header_image.image,
        });
    };

    const fetchTrack = async (uri, uid, context) => {
        const base62 = uri.split(":")[2];
        const res = await CosmosAsync.get(`https://api.spotify.com/v1/tracks/${base62}`);
        if (context && uid && Spicetify.URI.isPlaylistV1OrV2(context)) {
            context = Spicetify.URI.from(context).toURLPath(true) + "?uid=" + uid;
        }
        return ({
            uri,
            title: res.name,
            description: res.artists[0].name,
            imageUrl: res.album.images[0].url,
            context,
        });
    };

    const fetchEpisode = async (uri) => {
        const base62 = uri.split(":")[2];
        const res = await CosmosAsync.get(`https://api.spotify.com/v1/episodes/${base62}`);
        console.log(res);
        return ({
            uri,
            title: res.name,
            description: res.show.name + " episode",
            imageUrl: res.show.images[0].url,
        });
    };

    const fetchPlaylist = async (uri) => {
        const res = await Spicetify.CosmosAsync.get(
            `sp://core-playlist/v1/playlist/${uri}/metadata`,
            { policy: { picture: true, name: true } }
        );
        return ({
            uri,
            title: res.metadata.name,
            description: "Playlist",
            imageUrl: res.metadata.picture,
        });
    };

    new Spicetify.ContextMenu.Item('Share on Twitter', shareMenu, void(0), 'twitter').register()
})()
