/**
 * nuri-bridge.js
 * 누리 플랫폼 ↔ 스크래치 에디터 postMessage 통신 브릿지
 *
 * ─── 수신 (부모 플랫폼 → 에디터) ────────────────────
 *   LOAD_PROJECT    { projectData: ArrayBuffer }
 *                 | { projectUrl: string }
 *   REQUEST_PROJECT  현재 프로젝트 데이터 요청 (저장)
 *   REQUEST_SUBMIT   현재 프로젝트 데이터 요청 (제출)
 *
 * ─── 송신 (에디터 → 부모 플랫폼) ────────────────────
 *   EDITOR_READY
 *   PROJECT_DATA  { action: 'save'|'submit', projectData: Uint8Array, projectName: string }
 *   PROJECT_CHANGED  { hasChanges: true }
 */

class NuriBridge {
    constructor () {
        this._vm = null;
        this._messageHandler = this._onMessage.bind(this);
        window.addEventListener('message', this._messageHandler);
    }

    /**
     * scratch-vm 인스턴스 연결 (VM 준비 완료 후 호출).
     * 부모에게 EDITOR_READY 알리고 변경 감지 시작.
     */
    setVM (vm) {
        this._vm = vm;
        this._setupChangeDetection();
        this._sendToParent({type: 'EDITOR_READY'});
    }

    /** [저장] 버튼에서 직접 호출 */
    saveProject () {
        return this._handleRequest('save');
    }

    /** [제출] 버튼에서 직접 호출 */
    submitProject () {
        return this._handleRequest('submit');
    }

    /** 컴포넌트 언마운트 시 정리 */
    destroy () {
        this._vm = null;
    }

    // ─── 내부 ──────────────────────────────────────────

    _sendToParent (data) {
        const target = window.parent !== window ? window.parent : window;
        target.postMessage(data, '*');
    }

    _setupChangeDetection () {
        if (!this._vm) return;
        this._vm.on('PROJECT_CHANGED', () => {
            this._sendToParent({type: 'PROJECT_CHANGED', payload: {hasChanges: true}});
        });
    }

    async _onMessage (event) {
        const {type, payload} = event.data ?? {};
        if (!type) return;
        switch (type) {
        case 'LOAD_PROJECT':
            await this._handleLoadProject(payload ?? {});
            break;
        case 'REQUEST_PROJECT':
            await this._handleRequest('save');
            break;
        case 'REQUEST_SUBMIT':
            await this._handleRequest('submit');
            break;
        default:
            break;
        }
    }

    async _handleLoadProject (payload) {
        if (!this._vm) return;
        try {
            let projectData;
            if (payload.projectData) {
                projectData = payload.projectData;
            } else if (payload.projectUrl) {
                const res = await fetch(payload.projectUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                projectData = await res.arrayBuffer();
            }
            if (projectData) {
                await this._vm.loadProject(projectData);
            }
        } catch (err) {
            console.error('[nuri-bridge] loadProject failed:', err);
        }
    }

    async _handleRequest (action) {
        if (!this._vm) return;
        try {
            const projectData = await this._vm.saveProjectSb3();
            this._sendToParent({
                type: 'PROJECT_DATA',
                payload: {
                    action,
                    projectData,
                    projectName: this._vm.runtime.projectName || 'project'
                }
            });
        } catch (err) {
            console.error('[nuri-bridge] saveProject failed:', err);
        }
    }
}

// 싱글톤 인스턴스
const nuriBridge = new NuriBridge();
export default nuriBridge;
