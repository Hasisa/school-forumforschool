// comments.js — полностью рабочий пример с attachments

// ---------------- Firebase инициализация ----------------
const firebaseConfig = {
  apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
  authDomain: "educonnect-958e2.firebaseapp.com",
  projectId: "educonnect-958e2",
  storageBucket: "educonnect-958e2.firebasestorage.com",
  messagingSenderId: "1044066506835",
  appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------------- URL параметры ----------------
const urlParams = new URLSearchParams(window.location.search);
const COMMUNITY_ID = urlParams.get('communityId');
const POST_ID = urlParams.get('postId');

if (!COMMUNITY_ID || !POST_ID) {
  alert('Community ID или Post ID не указаны в URL.');
  throw new Error('Missing community or post ID in URL');
}

// ---------------- Constants ----------------
const ANONYMOUS_USER = { uid: 'anonymous', displayName: 'Anonymous User', photoURL: null };
let currentUser = ANONYMOUS_USER;
let unsubscribePost = null;
let unsubscribeComments = null;
let currentReplyData = null;

// ---------------- DOM элементы ----------------
const elements = {
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),

  post: document.getElementById('post'),
  postAuthorAvatar: document.getElementById('post-author-avatar'),
  postAuthorName: document.getElementById('post-author-name'),
  postDate: document.getElementById('post-date'),
  postText: document.getElementById('post-text'),
  postAttachments: document.getElementById('post-attachments'),
  postLikeBtn: document.getElementById('post-like-btn'),
  postLikeCount: document.getElementById('post-like-count'),

  commentsContainer: document.getElementById('comments-container'),

  commentInputSection: document.getElementById('comment-input-section'),
  commentInput: document.getElementById('comment-input'),
  postCommentBtn: document.getElementById('post-comment-btn'),

  replyModal: document.getElementById('reply-modal'),
  replyModalTitle: document.getElementById('reply-modal-title'),
  closeReplyModal: document.getElementById('close-reply-modal'),
  replyInput: document.getElementById('reply-input'),
  cancelReply: document.getElementById('cancel-reply'),
  submitReply: document.getElementById('submit-reply')
};

// ---------------- Утилиты ----------------
function getUserDisplayName(userData) {
  if (!userData) return 'Anonymous';
  const fullName = ((userData.firstName || '') + ' ' + (userData.lastName || '')).trim();
  return fullName || userData.displayName || 'Anonymous';
}

function getUserAvatar(userData, fallbackSeed) {
  if (userData?.avatarURL) return userData.avatarURL;
  const seed = userData?.displayName || userData?.firstName || fallbackSeed || 'anonymous';
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------------- Инициализация ----------------
function init() {
  elements.commentInput.maxLength = 500;
  elements.replyInput.maxLength = 500;
  setupAuthListener();
  setupEventListeners();
  loadPost();
}

// ---------------- Auth ----------------
function setupAuthListener() {
  auth.onAuthStateChanged(user => {
    currentUser = user || ANONYMOUS_USER;
    elements.commentInputSection.style.display = user ? 'block' : 'none';
  });
}

// ---------------- События ----------------
function setupEventListeners() {
  elements.retryBtn?.addEventListener('click', loadPost);
  elements.closeReplyModal.addEventListener('click', closeReplyModal);
  elements.cancelReply.addEventListener('click', closeReplyModal);
  elements.submitReply.addEventListener('click', handleSubmitReply);
  elements.postCommentBtn.addEventListener('click', handlePostComment);

  elements.replyModal.addEventListener('click', e => {
    if (e.target === elements.replyModal) closeReplyModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !elements.replyModal.classList.contains('hidden')) closeReplyModal();
  });
}

// ---------------- Post ----------------
function showLoading() { 
  elements.loading.classList.remove('hidden'); 
  elements.error.classList.add('hidden'); 
  elements.post.classList.add('hidden'); 
}

function showError(msg) { 
  elements.loading.classList.add('hidden'); 
  elements.error.classList.remove('hidden'); 
  elements.post.classList.add('hidden'); 
  elements.errorMessage.textContent = msg; 
}

function showPost() { 
  elements.loading.classList.add('hidden'); 
  elements.error.classList.add('hidden'); 
  elements.post.classList.remove('hidden'); 
}

function loadPost() {
  showLoading();
  unsubscribePost?.();
  const postRef = db.collection('communities').doc(COMMUNITY_ID).collection('posts').doc(POST_ID);

  unsubscribePost = postRef.onSnapshot(postSnap => {
    if (postSnap.exists) {
      const postData = postSnap.data();
      displayPost(postData);
      loadComments();
      showPost();
    } else showError('Post not found');
  }, error => showError('Failed to load post.'));
}

function displayPost(postData) {
  if (!postData.authorId) return updatePostUIAnonymous(postData);

  db.collection('users').doc(postData.authorId).get().then(authorDoc => {
    const authorData = authorDoc.exists ? authorDoc.data() : null;
    updatePostUI(authorData, postData);
  }).catch(() => updatePostUIAnonymous(postData));
}

function updatePostUI(authorData, postData) {
  elements.postAuthorAvatar.src = getUserAvatar(authorData, postData.authorId);
  elements.postAuthorName.textContent = getUserDisplayName(authorData);
  elements.postDate.textContent = formatDate(postData.createdAt);
  elements.postText.textContent = postData.content;

  // Attachments
  elements.postAttachments.innerHTML = '';
  if(postData.attachments?.length){
    postData.attachments.forEach(file=>{
      if(file.url.match(/\.(jpeg|jpg|png|gif|webp)$/i)){
        const img = document.createElement('img');
        img.src = file.url;
        img.alt = file.name || 'Attachment';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.marginBottom = '8px';
        elements.postAttachments.appendChild(img);
      } else {
        const a = document.createElement('a');
        a.href = file.url; 
        a.target='_blank';
        a.textContent = file.name;
        a.style.display = 'block';
        a.style.marginBottom = '4px';
        elements.postAttachments.appendChild(a);
      }
    });
  }

  const likeCount = Array.isArray(postData.likedBy) ? postData.likedBy.length : 0;
  updateLikeButton(elements.postLikeBtn, elements.postLikeCount, likeCount, postData.likedBy || []);

  elements.postLikeBtn.onclick = () => {
    if (currentUser.uid === 'anonymous') { alert('Please log in to like.'); return; }
    handleLike('post', POST_ID, null, postData.likedBy || []);
  };
}

function updatePostUIAnonymous(postData) {
  elements.postAuthorAvatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=anonymous`;
  elements.postAuthorName.textContent = 'Anonymous';
  elements.postDate.textContent = formatDate(postData.createdAt);
  elements.postText.textContent = postData.content;
  elements.postAttachments.innerHTML = '';
  const likeCount = Array.isArray(postData.likedBy) ? postData.likedBy.length : 0;
  updateLikeButton(elements.postLikeBtn, elements.postLikeCount, likeCount, postData.likedBy || []);
  elements.postLikeBtn.onclick = () => alert('Please log in to like.');
}

// ---------------- Comments ----------------
function loadComments() {
  unsubscribeComments?.();

  const commentsRef = db.collection('communities').doc(COMMUNITY_ID)
    .collection('posts').doc(POST_ID).collection('comments').orderBy('createdAt', 'asc');

  unsubscribeComments = commentsRef.onSnapshot(snapshot => {
    const comments = [];
    const promises = [];

    snapshot.forEach(docSnap => {
      const commentData = { id: docSnap.id, ...docSnap.data() };
      promises.push(loadReplies(docSnap.id).then(replies => { 
        commentData.replies = replies; 
        comments.push(commentData); 
      }));
    });

    Promise.all(promises).then(() => {
      comments.sort((a,b)=>a.createdAt?.seconds - b.createdAt?.seconds);
      displayComments(comments);
    });
  });
}

function loadReplies(commentId) {
  const repliesRef = db.collection('communities').doc(COMMUNITY_ID)
    .collection('posts').doc(POST_ID)
    .collection('comments').doc(commentId).collection('replies').orderBy('createdAt', 'asc');

  return repliesRef.get().then(snapshot => {
    const replies = [];
    snapshot.forEach(docSnap => replies.push({ id: docSnap.id, ...docSnap.data(), replies: [] }));
    return replies;
  }).catch(() => []);
}

function displayComments(comments) {
  elements.commentsContainer.innerHTML = '';
  if (!comments.length) return elements.commentsContainer.innerHTML = '<p class="no-comments">No comments yet.</p>';
  comments.forEach(comment => createCommentElement(comment).then(el => elements.commentsContainer.appendChild(el)));
}

function createCommentElement(commentData, isReply=false) {
  return new Promise(resolve => {
    db.collection('users').doc(commentData.authorId).get().then(authorDoc => {
      const authorData = authorDoc.exists ? authorDoc.data() : null;
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment' + (isReply ? ' reply' : '');
      commentDiv.id = `comment-${commentData.id}`;
      const likeCount = Array.isArray(commentData.likedBy)?commentData.likedBy.length:0;
      const isLiked = (commentData.likedBy||[]).includes(currentUser.uid);
      const authorName = getUserDisplayName(authorData);
      const avatarURL = getUserAvatar(authorData, commentData.authorId || 'anonymous');

      commentDiv.innerHTML = `
        <div class="comment-header">
          <div class="comment-author">
            <img src="${avatarURL}" alt="Author avatar" class="avatar" />
            <span class="comment-author-name">${authorName}</span>
          </div>
          <time class="comment-date">${formatDate(commentData.createdAt)}</time>
        </div>
        <div class="comment-content"><p>${escapeHtml(commentData.content)}</p></div>
        <div class="comment-attachments"></div>
        <div class="comment-actions">
          <button class="like-btn ${isLiked?'liked':''}" ${currentUser.uid==='anonymous'?'disabled':''}>
            <i class="far fa-heart"></i>
            <span class="like-count">${likeCount}</span>
          </button>
          <button class="reply-btn" ${currentUser.uid==='anonymous'?'disabled':''}>
            <i class="far fa-comment"></i> Reply
          </button>
        </div>
      `;

      // Attachments
      const attachmentsContainer = commentDiv.querySelector('.comment-attachments');
      if(commentData.attachments?.length){
        commentData.attachments.forEach(file => {
          if(file.url.match(/\.(jpeg|jpg|png|gif|webp)$/i)){
            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.name || 'Attachment';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            img.style.marginBottom = '4px';
            attachmentsContainer.appendChild(img);
          } else {
            const a = document.createElement('a');
            a.href = file.url;
            a.target = '_blank';
            a.textContent = file.name;
            a.style.display = 'block';
            a.style.marginBottom = '2px';
            attachmentsContainer.appendChild(a);
          }
        });
      }

      const likeBtn = commentDiv.querySelector('.like-btn');
      const replyBtn = commentDiv.querySelector('.reply-btn');

      likeBtn.onclick = () => {
        if(currentUser.uid==='anonymous'){ alert('Please log in to like.'); return; }
        handleLike('comment', commentData.id, null, commentData.likedBy || []);
      };
      replyBtn.onclick = () => {
        if(currentUser.uid==='anonymous'){ alert('Please log in to reply.'); return; }
        openReplyModal(commentData.id, authorName, 'comment');
      };

      if(commentData.replies?.length){
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'replies';
        const promises = commentData.replies.map(r => createCommentElement(r,true).then(el=>repliesDiv.appendChild(el)));
        Promise.all(promises).then(()=>commentDiv.appendChild(repliesDiv)).finally(()=>resolve(commentDiv));
      } else resolve(commentDiv);

    }).catch(()=>resolve(document.createElement('div')));
  });
}

// ---------------- Likes ----------------
function updateLikeButton(button,countElement,likeCount,likedBy){
  button.disabled = false;
  const isLiked = likedBy.includes(currentUser.uid);
  button.classList.toggle('liked', isLiked);
  countElement.textContent = likeCount;
}

function handleLike(type,itemId,parentId,currentLikedBy){
  if(currentUser.uid==='anonymous'){ alert('Please log in to like.'); return; }
  const isLiked = currentLikedBy.includes(currentUser.uid);
  const newLikedBy = isLiked ? currentLikedBy.filter(uid=>uid!==currentUser.uid)
                             : [...currentLikedBy, currentUser.uid];

  if(type==='post'){ 
    elements.postLikeCount.textContent = newLikedBy.length; 
    elements.postLikeBtn.classList.toggle('liked',!isLiked); 
  } else {
    const countEl = document.querySelector(`#comment-${itemId} .like-count`);
    const btnEl = document.querySelector(`#comment-${itemId} .like-btn`);
    if(countEl) countEl.textContent = newLikedBy.length;
    if(btnEl) btnEl.classList.toggle('liked', !isLiked);
  }

  let docRef;
  if(type==='post') docRef = db.collection('communities').doc(COMMUNITY_ID).collection('posts').doc(POST_ID);
  else if(type==='comment') docRef = db.collection('communities').doc(COMMUNITY_ID).collection('posts').doc(POST_ID).collection('comments').doc(itemId);

  const update = isLiked ? { likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) }
                         : { likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) };
  docRef.update(update).catch(console.error);
}

// ---------------- Reply ----------------
function openReplyModal(itemId,authorName,type){
  currentReplyData={itemId,authorName,type};
  elements.replyModalTitle.textContent=`Reply to ${authorName}`;
  elements.replyInput.value=`@${authorName} `;
  elements.replyInput.focus();
  setTimeout(()=>{ 
    const len=elements.replyInput.value.length; 
    elements.replyInput.setSelectionRange(len,len); 
  },100);
  elements.replyModal.classList.remove('hidden');
}

function closeReplyModal(){
  elements.replyModal.classList.add('hidden');
  elements.replyInput.value='';
  currentReplyData=null;
}

function handleSubmitReply(){
  if(currentUser.uid==='anonymous'){ alert('Please log in to reply.'); return; }
  if(!currentReplyData || !elements.replyInput.value.trim()) return;

  elements.submitReply.disabled=true;
  elements.submitReply.textContent='Posting...';

  const replyData = { 
    authorId: currentUser.uid, 
    content: elements.replyInput.value.trim(), 
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
    likedBy:[] 
  };
  const repliesRef = db.collection('communities').doc(COMMUNITY_ID).collection('posts').doc(POST_ID)
                        .collection('comments').doc(currentReplyData.itemId).collection('replies');

  repliesRef.add(replyData)
    .then(closeReplyModal)
    .catch(error=>{ console.error(error); alert('Failed to post reply.'); })
    .finally(()=>{ elements.submitReply.disabled=false; elements.submitReply.textContent='Post Reply'; });
}

// ---------------- Post Comment ----------------
function handlePostComment(){
  if(currentUser.uid==='anonymous'){ alert('Please log in to comment.'); return; }
  if(!elements.commentInput.value.trim()) return;

  elements.postCommentBtn.disabled=true;
  elements.postCommentBtn.textContent='Posting...';

  const commentData = { 
    authorId: currentUser.uid, 
    content: elements.commentInput.value.trim(), 
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
    likedBy:[], 
    attachment:[] 
  };
  const commentsRef = db.collection('communities').doc(COMMUNITY_ID).collection('posts').doc(POST_ID).collection('comments');

  commentsRef.add(commentData)
    .then(()=>{ elements.commentInput.value=''; })
    .catch(error=>{ console.error(error); alert('Failed to post comment.'); })
    .finally(()=>{ elements.postCommentBtn.disabled=false; elements.postCommentBtn.textContent='Post Comment'; });
}

// ---------------- Запуск ----------------
window.addEventListener('load', init);
