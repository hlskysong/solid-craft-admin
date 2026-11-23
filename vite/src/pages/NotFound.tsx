import { Link } from '@tanstack/solid-router';
import { ArrowRight } from 'solid-craft-icons';

/** catch-all 路由页：保留 admin 布局，只在内容区提示。 */
export default function NotFound() {
  return (
    <div class="pro-page-heading">
      <div>
        <h2>404 · 页面不存在</h2>
        <p>当前地址没有匹配的页面，请从左侧菜单选择，或返回工作台。</p>
      </div>
      <Link to="/" class="pro-link">
        返回工作台
        <span aria-hidden="true"><ArrowRight size="14" /></span>
      </Link>
    </div>
  );
}
