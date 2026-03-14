/**
 * nuri-bridge.js
 * 누리 플랫폼 ↔ 스크래치 에디터 postMessage 통신 브릿지
 *
 * ─── 수신 (부모 플랫폼 → 에디터) ────────────────────
 *   REQUEST_SAVE                      현재 프로젝트 .sb3 저장 요청
 *   REQUEST_SUBMIT                    현재 프로젝트 .sb3 과제 제출 요청
 *   LOAD_PROJECT_URL  { url: string } URL에서 .sb3 템플릿 로드
 *
 * ─── 송신 (에디터 → 부모 플랫폼) ────────────────────
 *   SCRATCH_READY                     에디터 초기화 완료
 *   SCRATCH_SAVE     { payload: string } base64 인코딩된 .sb3 (자동저장)
 *   SCRATCH_SUBMIT   { payload: string } base64 인코딩된 .sb3 (제출)
 *   SCRATCH_LOADED                    프로젝트 로드 완료
 *   SCRATCH_ERROR    { error: string } 오류 발생
 */

let _initialized = false;

/**
 * VM 준비 완료 후 호출. 부모 플랫폼에 READY 알리고 메시지 수신 시작.
 */
export function initNuriBridge () {
    if (_initialized) return;
    _initialized = true;

    window.addEventListener('message', _handleMessage);

    // 에디터 준비 완료 알림
    _postToParent({type: 'SCRATCH_READY'});
}

/**
 * 컴포넌트 언마운트 시 정리
 */
export function destroyNuriBridge () {
    window.removeEventListener('message', _handleMessage);
    _initialized = false;
}

// ─── 내부 ────────────────────────────────────────────

function _postToParent (data) {
    // iframe 안에 있을 때는 window.parent, 직접 열렸을 때는 window 자신
    const target = window.parent !== window ? window.parent : window;
    target.postMessage(data, '*');
}

async function _handleMessage (event) {
    const {type, url} = event.data ?? {};
    if (!type) return;

    switch (type) {
    case 'REQUEST_SAVE':
        await _handleSave();
        break;
    case 'REQUEST_SUBMIT':
        await _handleSubmit();
        break;
    case 'LOAD_PROJECT_URL':
        if (url) await _handleLoadFromUrl(url);
        break;
    default:
        break;
    }
}

/**
 * 에디터 내부 [저장] 버튼에서 직접 호출
 */
export async function triggerSave () {
    return _handleSave();
}

/**
 * 에디터 내부 [제출] 버튼에서 직접 호출
 */
export async function triggerSubmit () {
    return _handleSubmit();
}

async function _handleSave () {
    const vm = window.vm;
    if (!vm) {
        _postToParent({type: 'SCRATCH_ERROR', error: 'VM not initialized'});
        return;
    }
    try {
        // saveProjectSb3() → Promise<Uint8Array>
        const sb3Data = await vm.saveProjectSb3();
        _postToParent({type: 'SCRATCH_SAVE', payload: _uint8ToBase64(sb3Data)});
    } catch (err) {
        _postToParent({type: 'SCRATCH_ERROR', error: String(err)});
    }
}

async function _handleSubmit () {
    const vm = window.vm;
    if (!vm) {
        _postToParent({type: 'SCRATCH_ERROR', error: 'VM not initialized'});
        return;
    }
    try {
        const sb3Data = await vm.saveProjectSb3();
        _postToParent({type: 'SCRATCH_SUBMIT', payload: _uint8ToBase64(sb3Data)});
    } catch (err) {
        _postToParent({type: 'SCRATCH_ERROR', error: String(err)});
    }
}

async function _handleLoadFromUrl (url) {
    const vm = window.vm;
    if (!vm) {
        _postToParent({type: 'SCRATCH_ERROR', error: 'VM not initialized'});
        return;
    }
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        await vm.loadProject(buffer);
        _postToParent({type: 'SCRATCH_LOADED'});
    } catch (err) {
        _postToParent({type: 'SCRATCH_ERROR', error: String(err)});
    }
}

function _uint8ToBase64 (bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
